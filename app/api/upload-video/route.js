import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Telegram Bot Konfiqurasiyası
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8577853929:AAHCVFefEJ_fqiein8bMwgapewf4Vrg3Gao";
// Kanalın ID və ya istifadəçi adı (məsələn: @kanal_adi və ya -100xxxxxxxxxx)
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("video") || formData.get("file");
    const chatId = formData.get("chat_id") || DEFAULT_CHAT_ID;

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "Video faylı tapılmadı." },
        { status: 400 }
      );
    }

    if (!chatId) {
      return NextResponse.json(
        {
          success: false,
          message: "Telegram Kanal/Chat ID təyin edilməyib. Zəhmət olmasa TELEGRAM_CHAT_ID mühit dəyişənini və ya form-data-da chat_id parametrini göndərin.",
        },
        { status: 400 }
      );
    }

    // Telegram Bot API-nin standart limit yoxlanışı (50 MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Video ölçüsü 50 MB-dan böyük ola bilməz (Standart Telegram Bot API limiti).",
        },
        { status: 400 }
      );
    }

    // 1. Telegram API-yə göndərmək üçün FormData formalaşdırırıq
    const tgFormData = new FormData();
    tgFormData.append("chat_id", chatId);
    tgFormData.append("video", file, file.name || "video.mp4");
    tgFormData.append("caption", `Mülkera Əmlak Videosu: ${file.name || "Elan videosu"}`);
    tgFormData.append("supports_streaming", "true");

    // 2. Telegram Bot API: sendVideo çağırışı
    const sendVideoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
      method: "POST",
      body: tgFormData,
    });

    const sendVideoData = await sendVideoRes.json();

    if (!sendVideoRes.ok || !sendVideoData.ok) {
      console.error("[Telegram sendVideo Xətası]:", sendVideoData);
      return NextResponse.json(
        {
          success: false,
          message: sendVideoData.description || "Video Telegram kanalına yüklənə bilmədi.",
        },
        { status: 502 }
      );
    }

    // 3. Qayıdan məlumatdan video obyektini və file_id-ni götürürük
    const videoObj = sendVideoData.result?.video || sendVideoData.result?.document;
    const fileId = videoObj?.file_id;

    if (!fileId) {
      return NextResponse.json(
        { success: false, message: "Telegram-dan file_id əldə edilmədi." },
        { status: 500 }
      );
    }

    // 4. Telegram Bot API: getFile vasitəsilə faylın yolunu (file_path) alırıq
    const getFileRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
    );
    const getFileData = await getFileRes.json();

    if (!getFileRes.ok || !getFileData.ok) {
      console.error("[Telegram getFile Xətası]:", getFileData);
      return NextResponse.json(
        {
          success: false,
          message: getFileData.description || "Video fayl yolu Telegram-dan alına bilmədi.",
        },
        { status: 502 }
      );
    }

    const filePath = getFileData.result?.file_path;

    if (!filePath) {
      return NextResponse.json(
        { success: false, message: "Fayl yolu (file_path) tapılmadı." },
        { status: 500 }
      );
    }

    // 5. Təhlükəsiz video URL-lərinin hazırlanması
    // A) Daxili təhlükəsiz proxy URL (Bot tokeni istifadəçilərə ifşa etmir və brauzerdə video axınını dəstəkləyir):
    const secureStreamUrl = `/api/video-stream?path=${encodeURIComponent(filePath)}`;
    
    // B) Birbaşa Telegram URL (Bot token URL daxilində görünür):
    const directTelegramUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

    return NextResponse.json({
      success: true,
      data: {
        messageId: sendVideoData.result?.message_id,
        fileId: fileId,
        filePath: filePath,
        videoUrl: secureStreamUrl,
        directUrl: directTelegramUrl,
        fileSize: videoObj?.file_size,
        duration: videoObj?.duration,
        width: videoObj?.width,
        height: videoObj?.height,
      },
    });
  } catch (error) {
    console.error("[upload-video Xətası]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gözlənilməz server xətası baş verdi." },
      { status: 500 }
    );
  }
}
