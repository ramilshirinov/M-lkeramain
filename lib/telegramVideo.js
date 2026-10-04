// SERVER-ONLY (Node runtime). Route handler-lərdən istifadə edin, "use client" fayllarından yox.
//
// Problem: istifadəçinin videosu Telegram-a OLDUĞU KİMİ göndərilirdi, brauzer də onu olduğu kimi
// oynadırdı. Audio kodek brauzerin dəstəklədiyi deyilsə (AC-3/E-AC-3 Dolby, PCM, AMR, ALAC ...)
// video görünür, amma SƏS GƏLMİR. Həll: Telegram-a göndərməzdən əvvəl hər videonu
//   MP4 konteyner + H.264 (yuv420p) video + AAC-LC (≤ stereo) səs + "faststart"
// formatına salırıq. Artıq uyğun olan axınlar yenidən kodlanmır (yalnız köçürülür) — sürətlidir.

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

// Serverdə sistem ffmpeg-i istifadə etmək istəsəniz: FFMPEG_PATH / FFPROBE_PATH təyin edin.
const FFMPEG = process.env.FFMPEG_PATH || ffmpegStatic;
const FFPROBE = process.env.FFPROBE_PATH || ffprobeStatic?.path;

// Telegram Bot API: yüklənmiş faylı geri oxumaq (stream) yalnız ≤ 20 MB üçün işləyir.
export const MAX_BYTES = 20 * 1024 * 1024;
const TARGET_BYTES = 17.5 * 1024 * 1024; // yenidən kodlayanda hədəf (20 MB limitindən ~12% ehtiyatla)
const MIN_VIDEO_KBPS = 250; // bundan aşağı bitreytdə görüntü pis olur → belə uzun videonu rədd edirik
const AUDIO_KBPS = 128;
const SILENT_DB = -60; // max_volume bundan aşağıdırsa səs "sakit" sayılır
const MAX_PARALLEL = Number(process.env.VIDEO_MAX_PARALLEL) || 2; // eyni anda neçə ffmpeg
const FFMPEG_TIMEOUT_MS = 5 * 60 * 1000;

const SAFE_H264_PROFILES = new Set(["Baseline", "Constrained Baseline", "Main", "High"]);

export class VideoError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "VideoError";
    this.status = status;
  }
}

/* ----------------------------- köməkçilər ----------------------------- */

let active = 0;
const waiters = [];
async function withSlot(fn) {
  while (active >= MAX_PARALLEL) await new Promise((r) => waiters.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      p.kill("SIGKILL");
    }, FFMPEG_TIMEOUT_MS);

    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr = (stderr + d).slice(-6000)));
    p.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    p.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve({ stdout, stderr });
      const err = new Error(`${path.basename(cmd)} çıxış kodu ${code}${timedOut ? " (vaxt aşımı)" : ""}: ${stderr.slice(-500)}`);
      err.timedOut = timedOut;
      reject(err);
    });
  });
}

async function probe(file) {
  const { stdout } = await run(FFPROBE, ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file]);
  const j = JSON.parse(stdout);
  const streams = j.streams || [];
  const v = streams.find((s) => s.codec_type === "video" && !s.disposition?.attached_pic);
  const a = streams.find((s) => s.codec_type === "audio");

  let width = Number(v?.width) || 0;
  let height = Number(v?.height) || 0;
  const rot = Math.abs(Number(v?.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v?.tags?.rotate ?? 0)) % 360;
  if (rot === 90 || rot === 270) [width, height] = [height, width];

  return {
    v,
    a,
    width,
    height,
    duration: Number(j.format?.duration) || Number(v?.duration) || 0,
  };
}

// Çıxış faylında səsin həqiqətən eşidilib-eşidilmədiyini yoxlayır (mikrofon söndürülmüş yazılar).
async function maxVolumeDb(file) {
  try {
    const { stderr } = await run(FFMPEG, ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "volumedetect", "-f", "null", "-"]);
    const m = /max_volume:\s*(-?[\d.]+|-inf)\s*dB/.exec(stderr);
    if (!m) return null;
    return m[1] === "-inf" ? -Infinity : Number(m[1]);
  } catch {
    return null;
  }
}

function scaleFilter(maxSide) {
  const even = (x) => `trunc(min(${maxSide},${x})/2)*2`;
  return `scale=w='if(gt(iw,ih),${even("iw")},-2)':h='if(gt(iw,ih),-2,${even("ih")})'`;
}

// Video üçün bitreyt büdcəsi (kbps). Çox uzun video üçün (büdcə MIN_VIDEO_KBPS-dən aşağı) -1 qaytarır.
function videoBudgetKbps(duration, withAudio) {
  if (!duration) return null;
  const totalKbps = (TARGET_BYTES * 8) / duration / 1000;
  const kbps = Math.floor(totalKbps - (withAudio ? AUDIO_KBPS : 0) - 24);
  return kbps < MIN_VIDEO_KBPS ? -1 : kbps;
}

function buildArgs(inPath, outPath, plan, src) {
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", inPath, "-map", "0:v:0"];
  if (plan.audio !== "none") args.push("-map", "0:a:0");

  if (plan.video === "copy") {
    args.push("-c:v", "copy");
  } else {
    const kbps = videoBudgetKbps(src.duration, plan.audio !== "none");
    const maxSide = kbps && kbps < 900 ? 854 : kbps && kbps < 2200 ? 1280 : 1920;
    args.push(
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
      "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.1",
      "-vf", scaleFilter(maxSide)
    );
    if (kbps) args.push("-maxrate", `${kbps}k`, "-bufsize", `${kbps}k`);
  }

  if (plan.audio === "copy") args.push("-c:a", "copy");
  if (plan.audio === "aac") {
    args.push("-c:a", "aac", "-b:a", `${AUDIO_KBPS}k`, "-ar", "48000");
    if (Number(src.a?.channels) > 2) args.push("-ac", "2"); // 5.1 → stereo; mono mono olaraq qalır (səs səviyyəsi dəyişmir)
  }

  args.push("-movflags", "+faststart", "-f", "mp4", outPath);
  return args;
}

/* ------------------------------ əsas API ------------------------------ */

/**
 * Faylı brauzer-uyğun MP4-ə çevirir.
 * @returns {{ buffer: Buffer, width: number, height: number, duration: number,
 *             audio: "ok"|"none"|"silent"|"dropped", plan: string }}
 *   audio: ok = səs var | none = audio treki yoxdur | silent = tam sakit |
 *          dropped = səs formatı oxuna bilmədi və çıxarıldı
 */
export async function normalizeVideo(file) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mulkera-vid-"));
  try {
    const ext = (path.extname(file.name || "").toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin").slice(0, 8);
    const inPath = path.join(dir, `in${ext}`);
    const outPath = path.join(dir, "out.mp4");
    await fs.writeFile(inPath, Buffer.from(await file.arrayBuffer()));

    let src;
    try {
      src = await probe(inPath);
    } catch (err) {
      console.error("[video] ffprobe xətası:", err.message);
      throw new VideoError("Fayl video kimi oxunmadı. MP4, MOV və ya WebM faylı seçin.", 422);
    }
    if (!src.v) throw new VideoError("Faylda video görüntüsü tapılmadı.", 422);

    const videoOk =
      src.v.codec_name === "h264" && src.v.pix_fmt === "yuv420p" && SAFE_H264_PROFILES.has(src.v.profile);
    const audioOk =
      !src.a ||
      (src.a.codec_name === "aac" && (!src.a.profile || src.a.profile === "LC") && Number(src.a.channels) <= 2);

    const plan = {
      video: videoOk ? "copy" : "h264",
      audio: !src.a ? "none" : audioOk ? "copy" : "aac",
    };

    if (plan.video === "h264" && videoBudgetKbps(src.duration, plan.audio !== "none") === -1) {
      throw new VideoError(
        `Video çox uzundur (~${Math.ceil(src.duration / 60)} dəq) və 20 MB-a sığdırıla bilməz. Daha qısa video seçin.`,
        413
      );
    }

    let audioDropped = false;
    await withSlot(async () => {
      try {
        await run(FFMPEG, buildArgs(inPath, outPath, plan, src));
      } catch (err) {
        // Səs axını dekod oluna bilmirsə (nadir kodeklər) videonu səssiz də olsa saxlayırıq və bunu bildiririk.
        if (!src.a || err.timedOut) throw err;
        console.warn("[video] səs ilə emal alınmadı, səssiz təkrar cəhd:", err.message);
        audioDropped = true;
        await run(FFMPEG, buildArgs(inPath, outPath, { ...plan, audio: "none" }, src));
      }
    }).catch((err) => {
      console.error("[video] ffmpeg xətası:", err.message);
      throw new VideoError(
        err.timedOut ? "Videonun emalı çox uzun çəkdi. Daha qısa video seçin." : "Videonu emal etmək mümkün olmadı.",
        422
      );
    });

    const out = await probe(outPath);
    const buffer = await fs.readFile(outPath);
    if (buffer.length > MAX_BYTES) {
      throw new VideoError("Video sıxıldıqdan sonra da 20 MB-a sığmadı. Daha qısa video seçin.", 413);
    }

    let audio = "none";
    if (out.a) {
      const db = await maxVolumeDb(outPath);
      audio = db !== null && db <= SILENT_DB ? "silent" : "ok";
    }
    if (audioDropped) audio = "dropped";

    const planText = `video:${plan.video} audio:${audioDropped ? "dropped" : plan.audio}`;
    console.log(
      `[video] giriş=${src.v.codec_name}+${src.a?.codec_name ?? "yoxdur"} (${(file.size / 1048576).toFixed(1)} MB)` +
        ` → ${planText} → çıxış=${out.v.codec_name}+${out.a?.codec_name ?? "yoxdur"} (${(buffer.length / 1048576).toFixed(1)} MB) səs=${audio}`
    );

    return { buffer, width: out.width, height: out.height, duration: Math.round(out.duration), audio, plan: planText };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Videonu normallaşdırır və Telegram kanalına göndərir.
 * Brauzerə YALNIZ öz stream URL-imizi qaytarır (bot tokeni heç vaxt çıxmır).
 */
export async function uploadVideoToTelegram(file) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "8577853929:AAHCVFefEJ_fqiein8bMwgapewf4Vrg3Gao";
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const apiBase = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";

  if (!botToken || !chatId) {
    console.error("[video] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID təyin edilməyib.");
    throw new VideoError("Telegram konfiqurasiyası tamamlanmayıb (server).", 500);
  }
  if (file.size > MAX_BYTES) {
    throw new VideoError(`Video ölçüsü ${MAX_BYTES / 1024 / 1024} MB-dan böyük ola bilməz.`, 400);
  }

  const video = await normalizeVideo(file);

  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("video", new Blob([video.buffer], { type: "video/mp4" }), "video.mp4");
  form.append("caption", `Mülkera Əmlak Videosu: ${file.name || "Elan videosu"}`);
  form.append("supports_streaming", "true");
  if (video.duration) form.append("duration", String(video.duration));
  if (video.width && video.height) {
    form.append("width", String(video.width));
    form.append("height", String(video.height));
  }

  const res = await fetch(`${apiBase}/bot${botToken}/sendVideo`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    console.error("[video] Telegram sendVideo xətası:", data);
    throw new VideoError(data?.description || "Video Telegram kanalına yüklənə bilmədi.", 502);
  }

  // Səssiz qısa videoları Telegram bəzən "animation" kimi qaytarır
  const media = data.result?.video || data.result?.animation || data.result?.document;
  if (!media?.file_id) throw new VideoError("Telegram-dan file_id əldə edilmədi.", 502);

  return {
    messageId: data.result?.message_id,
    fileId: media.file_id,
    videoUrl: `/api/video-stream?file_id=${encodeURIComponent(media.file_id)}`,
    fileSize: video.buffer.length,
    duration: video.duration,
    width: video.width,
    height: video.height,
    audio: video.audio,
    processing: video.plan,
  };
}
