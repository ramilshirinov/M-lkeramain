import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8577853929:AAHCVFefEJ_fqiein8bMwgapewf4Vrg3Gao";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");

    if (!filePath || filePath.includes("..")) {
      return new NextResponse("Fayl yolu yanlışdır", { status: 400 });
    }

    const telegramFileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

    // Brauzerdən gələn Range başlığını Telegram-a ötürürük (irəli/geri çəkmə üçün)
    const rangeHeader = req.headers.get("range");
    const headers = {};
    if (rangeHeader) {
      headers["Range"] = rangeHeader;
    }

    const response = await fetch(telegramFileUrl, { headers });

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
