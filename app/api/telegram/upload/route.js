import { NextResponse } from "next/server";
import { uploadVideoToTelegram, VideoError } from "@/lib/telegramVideo";

export const runtime = "nodejs"; // ffmpeg (child_process) yalnız Node runtime-da işləyir
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// lib/upload.js bu route-u çağırır və cavabda { url, path } və xəta halında { error } gözləyir.
export async function POST(req) {
  let formData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("[telegram/upload] formData oxunmadı:", err.message);
    return NextResponse.json({ error: "Fayl serverə tam çatmadı. Yenidən cəhd edin." }, { status: 400 });
  }

  const file = formData.get("video") || formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Video faylı tapılmadı" }, { status: 400 });
  }

  try {
    const r = await uploadVideoToTelegram(file);
    return NextResponse.json({
      success: true,
      url: r.videoUrl,
      path: r.fileId,
      name: file.name,
      size: file.size,
      audio: r.audio, // "ok" | "none" | "silent" | "dropped"
    });
  } catch (err) {
    if (!(err instanceof VideoError)) console.error("[telegram/upload] gözlənilməz xəta:", err);
    return NextResponse.json({ error: err?.message || "Server xətası" }, { status: err?.status || 500 });
  }
}
