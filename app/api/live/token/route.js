import { NextResponse } from "next/server";
import { createLiveKitToken, ensureLiveKitRoom, isLiveKitConfigured, getLiveKitWsUrl } from "@/lib/livekit";

/**
 * POST /api/live/token
 * Verilmiş otağa (canlı yayıma) qoşulmaq üçün LiveKit JWT tokeni qaytarır.
 * body: { roomName, identity, name, role: 'host' | 'rival' | 'viewer' }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { roomName, identity, name, role = "viewer" } = body;

    if (!roomName || !identity) {
      return NextResponse.json(
        { success: false, error: "roomName və identity tələb olunur." },
        { status: 400 }
      );
    }

    if (!isLiveKitConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "LiveKit konfiqurasiya edilməyib. .env faylında LIVEKIT_API_KEY, LIVEKIT_API_SECRET və NEXT_PUBLIC_LIVEKIT_URL dəyərlərini əlavə edin.",
        },
        { status: 503 }
      );
    }

    await ensureLiveKitRoom(roomName);

    const canPublish = role === "host" || role === "rival";
    const token = await createLiveKitToken(roomName, identity, {
      name,
      canPublish,
      canSubscribe: true,
      metadata: JSON.stringify({ role }),
    });

    return NextResponse.json({
      success: true,
      token,
      wsUrl: getLiveKitWsUrl(),
      roomName,
      canPublish,
    });
  } catch (error) {
    console.error("LiveKit token xətası:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
