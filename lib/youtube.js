import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const OAUTH_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";
const API_URL = "https://www.googleapis.com/youtube/v3";

// Vercel-ə yapışdırılan dəyərlərdəki boşluq/yeni sətir/dırnaqları təmizlə
export const clean = (v) => String(v ?? "").trim().replace(/^["']+|["']+$/g, "");
const REQUIRED_ENV = ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"];

export function ytMissing() {
  return REQUIRED_ENV.filter((k) => !clean(process.env[k]));
}

export function ytConfigured() {
  return ytMissing().length === 0;
}

const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export const limits = {
  chunkSize: 8 * 1024 * 1024, // 256 KiB-in misli olmalıdır
  maxBytes: () => num(process.env.YOUTUBE_MAX_VIDEO_MB, 500) * 1024 * 1024,
  userDaily: () => num(process.env.YOUTUBE_USER_DAILY_LIMIT, 5),
  globalDaily: () => num(process.env.YOUTUBE_GLOBAL_DAILY_LIMIT, 80),
  allowedOrigins: () =>
    clean(process.env.YOUTUBE_ALLOWED_ORIGINS || "http://localhost:3000")
      .split(",")
      .map((s) => clean(s).replace(/\/$/, ""))
      .filter(Boolean),
};

export function isOriginAllowed(req) {
  const origin = (req.headers.get("origin") || "").replace(/\/$/, "");
  if (!origin) return false;
  if (limits.allowedOrigins().includes(origin)) return true;
  try {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uploadTag = (uploadId) => `mk_${String(uploadId).replace(/-/g, "")}`;
export const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
export const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}`;

export class YouTubeError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

// ---- OAuth: refresh token → access token (yaddaşda keş) ----
let cache = { token: null, exp: 0 };

export async function getAccessToken() {
  if (cache.token && Date.now() < cache.exp - 60_000) return cache.token;

  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clean(process.env.YOUTUBE_CLIENT_ID),
      client_secret: clean(process.env.YOUTUBE_CLIENT_SECRET),
      refresh_token: clean(process.env.YOUTUBE_REFRESH_TOKEN),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    if (json.error === "invalid_grant") {
      console.error("[youtube] YOUTUBE_REFRESH_TOKEN etibarsızdır/bitib. Skripti yenidən işlət.");
    }
    throw new YouTubeError("oauth_failed", res.status, json);
  }
  cache = { token: json.access_token, exp: Date.now() + (json.expires_in || 3600) * 1000 };
  return cache.token;
}

// ---- Resumable session aç (unlisted) ----
export async function createResumableSession({ fileSize, mimeType, title, description, tags, origin }) {
  const token = await getAccessToken();
  const url = `${UPLOAD_URL}?uploadType=resumable&part=snippet,status&notifySubscribers=false`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(fileSize),
      "X-Upload-Content-Type": mimeType,
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify({
      snippet: { title, description, tags, categoryId: "22" },
      status: {
        privacyStatus: "unlisted",
        embeddable: true,
        selfDeclaredMadeForKids: false,
        license: "youtube",
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new YouTubeError("session_failed", res.status, await res.text());
  const location = res.headers.get("location");
  if (!location) throw new YouTubeError("no_session_url", 502);
  return location;
}

// ---- Videonu oxu (yoxdursa null) ----
export async function getVideo(videoId) {
  const token = await getAccessToken();
  const res = await fetch(
    `${API_URL}/videos?part=snippet,status&id=${encodeURIComponent(videoId)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) throw new YouTubeError("list_failed", res.status, await res.text());
  const json = await res.json();
  return json.items?.[0] || null;
}

// ---- Videonu sil (artıq yoxdursa false) ----
export async function deleteVideo(videoId) {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}/videos?id=${encodeURIComponent(videoId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 204 || res.status === 200) return true;
  if (res.status === 404) return false;
  throw new YouTubeError("delete_failed", res.status, await res.text());
}

// ---- Təhlükəsiz kütləvi silmə: heç vaxt throw etmir ----
export async function purgeVideos(videoIds = []) {
  const admin = getSupabaseAdmin();
  const results = [];
  for (const id of [...new Set(videoIds)].filter((x) => VIDEO_ID_RE.test(x || ""))) {
    try {
      const { count } = await admin
        .from("listing_photos")
        .select("id", { count: "exact", head: true })
        .eq("youtube_video_id", id);
      if ((count ?? 0) > 0) {
        results.push({ id, skipped: "in_use" });
        continue;
      }
      const existed = await deleteVideo(id);
      await admin
        .from("youtube_uploads")
        .update({ status: "deleted", deleted_at: new Date().toISOString() })
        .eq("video_id", id);
      results.push({ id, deleted: true, existed });
    } catch (e) {
      console.error("[youtube] purge failed:", id, e.status, e.detail || e.message);
      results.push({ id, error: true });
    }
  }
  return results;
}
