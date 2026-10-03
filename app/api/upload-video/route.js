import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Token və kanal YALNIZ .env.local-dan oxunur (kodda saxlanmır).
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// İstəyə bağlı: öz Telegram Bot API serverinizi qurduqda (limitləri qaldırır).
const TG_API = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";

// Telegram Bot API: sendVideo ≤ 50 MB, AMMA yüklənmiş faylı geri oxumaq (getFile → stream)
// yalnız ≤ 20 MB üçün işləyir. Stream işləməsi üçün limit 20 MB saxlanılır.
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const fail = (message, status) =>
  NextResponse.json({ success: false, message }, { status });

export async function POST(req) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("[upload-video] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID .env.local-da yoxdur.");
    return fail("Telegram konfiqurasiyası tamamlanmayıb (server).", 500);
  }

  try {
    // 1. Gələn multipart/form-data sorğusunu oxuyuruq.
    //    Content-Type başlığını əl ilə YAZMIRIQ — brauzer boundary-ni özü əlavə edir.
    let formData;
    try {
      formData = await req.formData();
    } catch (err) {
      console.error("[upload-video] formData oxunmadı:", err.message, {
        contentType: req.headers.get("content-type"),
        contentLength: req.headers.get("content-length"),
      });
      return fail("Fayl serverə tam çatmadı. Yenidən cəhd edin.", 400);
    }

    const file = formData.get("video") || formData.get("file");

    if (!file || typeof file === "string") {
      return fail("Video faylı tapılmadı.", 400);
    }

    if (file.size > MAX_SIZE) {
      return fail(`Video ölçüsü ${MAX_SIZE / 1024 / 1024} MB-dan böyük ola bilməz.`, 400);
    }

    // 2. Telegram sendVideo
    const tgForm = new FormData();
    tgForm.append("chat_id", CHAT_ID);
    tgForm.append("video", file, file.name || "video.mp4");
    tgForm.append("caption", `Mülkera Əmlak Videosu: ${file.name || "Elan videosu"}`);
    tgForm.append("supports_streaming", "true");

    const tgRes = await fetch(`${TG_API}/bot${BOT_TOKEN}/sendVideo`, {
      method: "POST",
      body: tgForm,
      signal: AbortSignal.timeout(120_000),
    });
    const tgData = await tgRes.json().catch(() => null);

    if (!tgRes.ok || !tgData?.ok) {
      console.error("[upload-video] Telegram sendVideo xətası:", tgData);
      return fail(tgData?.description || "Video Telegram kanalına yüklənə bilmədi.", 502);
    }

    // 3. file_id (Telegram bəzən videonu "document" kimi qaytarır)
    const media = tgData.result?.video || tgData.result?.document;
    const fileId = media?.file_id;

    if (!fileId) {
      return fail("Telegram-dan file_id əldə edilmədi.", 502);
    }

    // 4. Brauzerə YALNIZ öz stream endpoint-imizi veririk.
    //    file_id daimidir; Telegram-ın file_path linki isə müddətli ola bilər.
    //    Bot tokeni heç vaxt cavabda göndərilmir.
    return NextResponse.json({
      success: true,
      data: {
        messageId: tgData.result?.message_id,
        fileId,
        videoUrl: `/api/video-stream?file_id=${encodeURIComponent(fileId)}`,
        fileSize: media?.file_size,
        duration: media?.duration,
        width: media?.width,
        height: media?.height,
      },
    });
  } catch (error) {
    console.error("[upload-video] gözlənilməz xəta:", error);
    return fail(error?.message || "Gözlənilməz server xətası baş verdi.", 500);
  }
}