"use client";

import { useState, useRef } from "react";
import { FiVideo, FiUploadCloud, FiTrash2, FiCheckCircle, FiAlertCircle, FiLoader, FiVolume2, FiVolumeX } from "react-icons/fi";

/**
 * Mülkera — Telegram Kanalına Video Yükləmə Komponenti
 * H.264 MP4 və AAC-LC audio normallaşdırması ilə işləyir.
 *
 * @param {Object} props
 * @param {string} [props.value] - Mövcud yüklənmiş video URL-i
 * @param {function} props.onChange - Video URL-i dəyişdikdə çağırılan funksiya: (url: string | null) => void
 * @param {number} [props.maxSizeMB=20] - Maksimum icazə verilən fayl həcmi (MB)
 */
export default function TelegramVideoUploader({
  value,
  onChange,
  maxSizeMB = 20,
}) {
  const [videoUrl, setVideoUrl] = useState(value || "");
  const [audioStatus, setAudioStatus] = useState(null); // "ok" | "none" | "silent" | "dropped"
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Fayl növü yoxlanışı
    if (!file.type.startsWith("video/")) {
      setError("Zəhmət olmasa yalnız video faylı (MP4, WebM, MOV və s.) seçin.");
      return;
    }

    // Telegram Bot API və FFmpeg limiti (20 MB)
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Video ölçüsü maksimum ${maxSizeMB} MB ola bilər.`);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append("video", file);

      setUploadProgress(40);

      // app/api/telegram/upload/route.js çağırılır
      const res = await fetch("/api/telegram/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(85);

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Video yüklənərkən xəta baş verdi.");
      }

      const finalUrl = data.url;
      setVideoUrl(finalUrl);
      setAudioStatus(data.audio || "ok");
      setUploadProgress(100);
      onChange?.(finalUrl);
    } catch (err) {
      console.error("Telegram video upload error:", err);
      setError(err.message || "Videonu Telegram-a yükləmək mümkün olmadı.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading) return;
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemove = () => {
    setVideoUrl("");
    setAudioStatus(null);
    setError(null);
    onChange?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <FiVideo className="text-copper" /> Əmlak Videosu (Telegram Cloud Storage)
        </label>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Maks. {maxSizeMB} MB
        </span>
      </div>

      {videoUrl ? (
        // Video Yüklənib — Önizləmə Paneli
        <div className="space-y-2">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black aspect-video shadow-md group">
            <video
              src={videoUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            >
              Brauzeriniz video pleyeri dəstəkləmir.
            </video>

            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className="bg-emerald-600/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md backdrop-blur-sm">
                <FiCheckCircle /> Yükləndi
              </span>
              <button
                type="button"
                onClick={handleRemove}
                aria-label="Videonu sil"
                className="p-2 bg-red-600/90 hover:bg-red-700 text-white rounded-full transition shadow-md cursor-pointer"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </div>

          {/* Səs və Audio Durumu */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {audioStatus === "ok" ? (
              <>
                <FiVolume2 className="text-emerald-500 text-sm shrink-0" />
                <span>Audio bütövlüyü təmin edildi (H.264 + AAC Stereo uyğunlaşdırıldı)</span>
              </>
            ) : audioStatus === "silent" ? (
              <>
                <FiVolumeX className="text-amber-500 text-sm shrink-0" />
                <span>Video səssizdir (mikrofon qeydi çox zəif və ya söndürülüb)</span>
              </>
            ) : audioStatus === "dropped" ? (
              <>
                <FiVolumeX className="text-amber-500 text-sm shrink-0" />
                <span>Audio treki dekod oluna bilmədi (video səssiz olaraq saxlanıldı)</span>
              </>
            ) : (
              <>
                <FiVolumeX className="text-slate-400 text-sm shrink-0" />
                <span>Videoda audio axını yoxdur</span>
              </>
            )}
          </div>
        </div>
      ) : (
        // Video Yükləmə Çərçivəsi (Drag & Drop)
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragOver
              ? "border-copper bg-copper/5 dark:bg-copper/10"
              : "border-slate-300 dark:border-slate-700 hover:border-copper/70 bg-slate-50/50 dark:bg-slate-900/50"
          } ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            disabled={uploading}
          />

          {uploading ? (
            <div className="space-y-3 flex flex-col items-center">
              <FiLoader className="text-3xl text-copper animate-spin" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Video normallaşdırılır (FFmpeg) və Telegram-a yüklənir...
              </p>
              <div className="w-52 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-copper h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Səs və video axınları brauzer uyğunluğuna gətirilir...
              </span>
            </div>
          ) : (
            <div className="space-y-2 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-copper/10 text-copper flex items-center justify-center text-2xl mb-1">
                <FiUploadCloud />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Videonu buraya sürükləyin və ya <span className="text-copper underline">fayl seçin</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                MP4, MOV, WebM (Maksimum {maxSizeMB} MB)
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                ⚡ Avtomatik H.264 + AAC normallaşdırması ilə səs itkisi olmur
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900/50">
          <FiAlertCircle className="shrink-0 text-base" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
