"use client";

import { useEffect, useRef, useState } from "react";
import { FiVideo, FiX, FiRefreshCw, FiLoader } from "react-icons/fi";
import { useApp } from "@/context/AppContext";
import { uploadVideoToYouTube, deleteYoutubeVideo, youtubeThumb } from "@/lib/youtubeUpload";

const FALLBACK = {
  unauthorized: "Video yükləmək üçün hesabınıza daxil olun.",
  invalid_file: "Yalnız video faylı seçin.",
  file_too_large: "Video çox böyükdür.",
  rate_limited: "Gündəlik video yükləmə limiti dolub. Sabah yenidən cəhd edin.",
  youtube_not_configured: "Video xidməti hazırda aktiv deyil.",
  youtube_error: "Video xidməti ilə əlaqə qurulmadı. Bir azdan yenidən cəhd edin.",
  youtube_not_unlisted: "Video xidməti hazırda mövcud deyil. Zəhmət olmasa administratorla əlaqə saxlayın.",
  origin_not_allowed: "Video xidməti bu ünvandan əlçatan deyil.",
  upload_failed: "Yükləmə kəsildi. Yenidən cəhd edin.",
  server_error: "Gözlənilməz xəta baş verdi.",
};

export default function YouTubeVideoUploader({
  files = [],
  setFiles,
  label,
  onBusyChange,
  maxVideos = 1,
  maxMB = 500,
}) {
  const { t } = useApp();
  const [job, setJob] = useState(null); // { name, file, progress, error }
  const abortRef = useRef(null);
  const busy = !!job && !job.error;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => () => abortRef.current?.abort(), []); // səhifə bağlananda dayandır

  const msg = (code) => t?.upload?.yt?.[code] || FALLBACK[code] || FALLBACK.server_error;
  const canAdd = files.length < maxVideos && !busy;

  const run = async (file) => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setJob({ name: file.name, file, progress: 0, error: null });
    try {
      const item = await uploadVideoToYouTube(file, {
        signal: ctrl.signal,
        onProgress: (p) => setJob((j) => (j ? { ...j, progress: p } : j)),
      });
      setFiles((prev) => [...(prev || []), item]);
      setJob(null);
    } catch (e) {
      if (e.name === "AbortError") return setJob(null);
      setJob((j) => ({ ...(j || { name: file.name, file, progress: 0 }), error: msg(e.code) }));
    }
  };

  const onPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) return setJob({ name: file.name, file, progress: 0, error: msg("invalid_file") });
    if (file.size > maxMB * 1024 * 1024)
      return setJob({ name: file.name, file, progress: 0, error: `${msg("file_too_large")} (maks. ${maxMB} MB)` });
    run(file);
  };

  const remove = async (i) => {
    const f = files[i];
    setFiles((p) => p.filter((_, j) => j !== i));
    // Bu sessiyada yüklənib, hələ elana bağlanmayıb → dərhal sil.
    // Redaktədə mövcud video isə yalnız "Yadda saxla"-dan sonra silinir (edit səhifəsi edir).
    if (f?.isNew && f?.videoId) deleteYoutubeVideo(f.videoId).catch(() => {});
  };

  return (
    <div className="space-y-3">
      {label && <label className="block text-sm font-semibold text-navy dark:text-slate-200">{label}</label>}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {files.map((f, i) => (
          <div
            key={f.videoId || f.url || i}
            className="relative aspect-square overflow-hidden rounded-xl border border-navy/15 dark:border-slate-700 bg-slate-900"
          >
            {f.videoId ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={youtubeThumb(f.videoId)}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/90">
                  <FiVideo className="text-xl" />
                  <span className="px-1 text-center text-[10px] leading-tight">
                    {t?.upload?.yt?.processing || "YouTube emal edir"}
                  </span>
                </span>
              </>
            ) : (
              <video src={f.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
            )}
            <button
              type="button"
              aria-label={t?.common?.remove || "Sil"}
              onClick={() => remove(i)}
              className="absolute right-1 top-1 rounded-full bg-red-500 p-1.5 text-white shadow transition hover:bg-red-600 cursor-pointer"
            >
              <FiX className="text-xs" />
            </button>
          </div>
        ))}

        {canAdd && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-navy/20 dark:border-slate-700 text-xs text-navy/70 dark:text-slate-400 transition hover:border-copper hover:text-copper">
            <FiVideo className="mb-1 text-xl" />
            <span className="px-1 text-center">{t?.upload?.pickVideo || "Video seç"}</span>
            <input type="file" hidden accept="video/*" onChange={onPick} />
          </label>
        )}
      </div>

      <p className="text-xs text-navy/60 dark:text-slate-400">
        {t?.upload?.yt?.hint || `Maksimum ${maxMB} MB. Video təhlükəsiz şəkildə yüklənir və yalnız elanınızda göstərilir.`}
      </p>

      {job && (
        <div className="rounded-lg border border-navy/10 dark:border-slate-700 p-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="max-w-[200px] truncate text-navy dark:text-slate-200">{job.name}</span>
            {job.error ? (
              <button
                type="button"
                onClick={() => run(job.file)}
                className="flex items-center gap-1 text-red-600 hover:underline cursor-pointer"
              >
                <FiRefreshCw /> {t?.upload?.retry || "Yenidən"}
              </button>
            ) : (
              <span className="flex items-center gap-1 font-semibold text-copper">
                {job.progress >= 99 && <FiLoader className="animate-spin" />}
                {job.progress}%
              </span>
            )}
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
            <div
              className={`h-1.5 rounded transition-all duration-200 ${job.error ? "bg-red-500" : "bg-copper"}`}
              style={{ width: `${job.progress}%` }}
            />
          </div>
          {job.error && (
            <div className="mt-1 flex items-start justify-between gap-2 text-red-600">
              <p>{job.error}</p>
              <button type="button" onClick={() => setJob(null)} className="shrink-0 underline cursor-pointer">
                {t?.common?.close || "Bağla"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
