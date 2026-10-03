import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const videoFile = formData.get("video");

    if (!videoFile) {
      return NextResponse.json({ error: "Video faylı tapılmadı" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json({ error: "Telegram bot tənzimləmələri mövcud deyil" }, { status: 500 });
    }

    // Videonu Telegram-a göndərmək üçün FormData hazırlayırıq
    const telegramFormData = new FormData();
    telegramFormData.append("chat_id", chatId);
    telegramFormData.append("video", videoFile);

    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
      method: "POST",
      body: telegramFormData,
    });

    const telegramData = await telegramRes.json();

    if (!telegramData.ok) {
      return NextResponse.json(
        { error: telegramData.description || "Telegram-a yükləmə xətası" },
        { status: 500 }
      );
    }

    // Telegram-dan gələn video məlumatlarından file_id götürürük
    const videoObj = telegramData.result.video;
    const fileId = videoObj.file_id;

    // Stream/baxış üçün endpoint URL-i yaradırıq (və ya birbaşa file_id saxlayırıq)
    // Məsələn: /api/video-stream?file_id=...
    const fileUrl = `/api/video-stream?file_id=${fileId}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      path: fileId,
      name: videoFile.name,
      size: videoFile.size,
    });
  } catch (error) {
    console.error("Telegram upload error:", error);
    return NextResponse.json({ error: error.message || "Server xətası" }, { status: 500 });
  }
}