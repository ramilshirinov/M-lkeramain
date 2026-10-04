import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8577853929:AAHCVFefEJ_fqiein8bMwgapewf4Vrg3Gao";
const API_BASE = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";

// file_id -> file_path üçün yaddaş keşi (1 saat müddətində)
const filePathCache = new Map();

async function resolveFilePath(fileId) {
  if (!fileId) return null;
  const cached = filePathCache.get(fileId);
  if (cached && Date.now() - cached.time < 3600_000) {
    return cached.path;
  }

  const res = await fetch(`${API_BASE}/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok || !data.result?.file_path) {
    console.error("[video-stream] getFile xətası:", data);
    return null;
  }
  const p = data.result.file_path;
  filePathCache.set(fileId, { path: p, time: Date.now() });
  return p;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    let filePath = searchParams.get("path");
    const fileId = searchParams.get("file_id");

    if (!filePath && fileId) {
      filePath = await resolveFilePath(fileId);
    }

    if (!filePath || filePath.includes("..")) {
      return new NextResponse("Fayl yolu yanlışdır və ya tapılmadı", { status: 400 });
    }

    const telegramFileUrl = `${API_BASE}/file/bot${BOT_TOKEN}/${filePath}`;

    // Brauzerdən gələn Range başlığını (seeking / scrub üçün) Telegram-a ötürürük
    const rangeHeader = req.headers.get("range");
    const headers = {};
    if (rangeHeader) {
      headers["Range"] = rangeHeader;
    }

    const response = await fetch(telegramFileUrl, {
      headers,
    });

    if (!response.ok && response.status !== 206) {
      return new NextResponse("Video Telegram serverindən alına bilmədi", {
        status: response.status,
      });
    }

    const resHeaders = new Headers();
    const contentType = response.headers.get("content-type") || "video/mp4";
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    const acceptRanges = response.headers.get("accept-ranges") || "bytes";

    resHeaders.set("Content-Type", contentType);
    resHeaders.set("Accept-Ranges", acceptRanges);
    resHeaders.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");

    if (contentLength) resHeaders.set("Content-Length", contentLength);
    if (contentRange) resHeaders.set("Content-Range", contentRange);

    return new NextResponse(response.body, {
      status: response.status === 206 ? 206 : 200,
      headers: resHeaders,
    });
  } catch (err) {
    console.error("[video-stream Xətası]:", err);
    return new NextResponse("Video axını xətası", { status: 500 });
  }
}
