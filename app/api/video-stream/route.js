import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_API = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";

const MIME_BY_EXT = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  ogv: "video/ogg",
};

const FILE_ID_RE = /^[A-Za-z0-9_-]+$/; // Telegram file_id-də "/" olmur
const FILE_PATH_RE = /^[A-Za-z0-9_\-./]+$/;

const text = (msg, status) => new NextResponse(msg, { status });

export async function GET(req) {
  try {
    if (!BOT_TOKEN) return text("Telegram bot tokeni təyin edilməyib", 500);

    const { searchParams } = new URL(req.url);

    // Yeni format: ?file_id=...   |   Köhnə format: ?path=<file_path və ya file_id>
    const legacy = searchParams.get("path");
    let fileId = searchParams.get("file_id");
    let filePath = null;

    if (!fileId && legacy) {
      if (legacy.includes("/")) filePath = legacy;
      else fileId = legacy;
    }

    if (fileId) {
      if (!FILE_ID_RE.test(fileId)) return text("file_id yanlışdır", 400);

      // file_id → cari file_path (Telegram-ın link müddəti bitdikdə yenisini alırıq)
      const metaRes = await fetch(
        `${TG_API}/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`
      );
      const meta = await metaRes.json().catch(() => null);

      if (!meta?.ok || !meta.result?.file_path) {
        const tooBig = /too big/i.test(meta?.description || "");
        return text(
          tooBig ? "Video 20 MB-dan böyükdür, Telegram onu oxumağa icazə vermir" : "Telegram fayl yolu tapılmadı",
          tooBig ? 413 : 404
        );
      }
      filePath = meta.result.file_path;
    }

    if (!filePath || filePath.includes("..") || !FILE_PATH_RE.test(filePath)) {
      return text("Fayl yolu yanlışdır", 400);
    }

    // Brauzerin Range başlığını Telegram-a ötürürük (irəli/geri çəkmə üçün)
    const headers = {};
    const range = req.headers.get("range");
    if (range) headers["Range"] = range;

    const upstream = await fetch(`${TG_API}/file/bot${BOT_TOKEN}/${filePath}`, { headers });

    if (!upstream.ok && upstream.status !== 206) {
      return text("Video Telegram serverindən alına bilmədi", upstream.status);
    }

    // Content-Type: Telegram bəzən octet-stream qaytarır → uzantıya görə düzəldirik
    let contentType = upstream.headers.get("content-type");
    if (!contentType || contentType.startsWith("application/octet-stream")) {
      const ext = filePath.split(".").pop()?.toLowerCase();
      contentType = MIME_BY_EXT[ext] || "video/mp4";
    }

    const resHeaders = new Headers();
    resHeaders.set("Content-Type", contentType);
    resHeaders.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
    resHeaders.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");

    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    if (contentLength) resHeaders.set("Content-Length", contentLength);
    if (contentRange) resHeaders.set("Content-Range", contentRange);

    return new NextResponse(upstream.body, {
      status: upstream.status === 206 ? 206 : 200,
      headers: resHeaders,
    });
  } catch (err) {
    console.error("[video-stream] xəta:", err);
    return text("Video axını xətası", 500);
  }
}