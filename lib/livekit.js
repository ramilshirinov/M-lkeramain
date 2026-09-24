// Server-only LiveKit köməkçisi — canlı yayım (WebRTC) otaqları və tokenlər üçün
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

function getCreds() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;
  return { apiKey, apiSecret, wsUrl };
}

export function isLiveKitConfigured() {
  const { apiKey, apiSecret, wsUrl } = getCreds();
  return Boolean(apiKey && apiSecret && wsUrl);
}

/**
 * İştirakçı üçün LiveKit giriş tokeni yaradır.
 * @param {string} roomName - Otağın (canlı yayımın) unikal adı
 * @param {string} identity - İştirakçının unikal id-si
 * @param {object} opts - { name, canPublish, canSubscribe, metadata }
 */
export async function createLiveKitToken(roomName, identity, opts = {}) {
  const { apiKey, apiSecret } = getCreds();
  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit API açarları konfiqurasiya edilməyib (.env faylına baxın).");
  }

  const {
    name = identity,
    canPublish = false,
    canSubscribe = true,
    metadata = "",
  } = opts;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    metadata,
    ttl: "6h",
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
    canPublishData: true,
  });

  return await at.toJwt();
}

function getRoomServiceClient() {
  const { apiKey, apiSecret, wsUrl } = getCreds();
  if (!apiKey || !apiSecret || !wsUrl) return null;
  const httpUrl = wsUrl.replace(/^ws/, "http");
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

/**
 * LiveKit otağını yaradır (artıq varsa xəta vermir).
 */
export async function ensureLiveKitRoom(roomName, { maxParticipants = 200 } = {}) {
  const svc = getRoomServiceClient();
  if (!svc) return null;
  try {
    return await svc.createRoom({ name: roomName, maxParticipants, emptyTimeout: 60 * 30 });
  } catch (err) {
    // Otaq artıq mövcuddursa, sakitcə davam edirik
    console.warn("ensureLiveKitRoom:", err.message);
    return null;
  }
}

export async function endLiveKitRoom(roomName) {
  const svc = getRoomServiceClient();
  if (!svc) return null;
  try {
    return await svc.deleteRoom(roomName);
  } catch (err) {
    console.warn("endLiveKitRoom:", err.message);
    return null;
  }
}

export function getLiveKitWsUrl() {
  return getCreds().wsUrl || "";
}
