"use client";

import { useState, useRef, useEffect } from "react";
import { FiVideo, FiUploadCloud, FiTrash2, FiCheckCircle, FiAlertCircle, FiLoader, FiVolume2, FiVolumeX } from "react-icons/fi";

const DEFAULT_BOT_TOKEN = "8577853929:AAHCVFefEJ_fqiein8bMwgapewf4Vrg3Gao";

/**
 * Brauzerdən birbaşa Telegram API-yə yükləmə (Vercel 4.5 MB serverless limitini keçmək üçün).
 */
function uploadDirectlyToTelegram(file, chatId, onProgress) {
  return new Promise((resolve, reject) => {
    const tgFormData = new FormData();
    tgFormData.append("chat_id", chatId);
    tgFormData.append("video", file, file.name);
    tgFormData.append("supports_streaming", "true");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/sendVideo`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.ok) {
          const media = res.result?.video || res.result?.document || res.result?.animation;
          if (media?.file_id) {
            resolve({
              fileId: media.file_id,
              videoUrl: `/api/video-stream?file_id=${encodeURIComponent(media.file_id)}`,
              audio: "ok",
            });
            return;
          }
        }
        reject(new Error(res.description || `Telegram xətası (${xhr.status})`));
      } catch {
        reject(new Error("Telegram serverindən cavab oxunmadı"));
      }
    };

    xhr.onerror = () => reject(new Error("Şəbəkə xətası: Telegram serverinə birbaşa qoşulmaq olmadı."));
    xhr.send(tgFormData);
  });
}

/**
 * Mülkera — Telegram Kanalına Video Yükləmə Komponenti
 * Həm Vercel 4.5 MB limitini birbaşa Telegram yükləməsi ilə aşır,
 * həm də server xətalarında (413/500) HTML-i JSON kimi oxumamaq üçün təhlükəsiz işləyir.
 */
export default function TelegramVideoUploader({
  files = [],
  setFiles,
  value,
  onChange,
  label = "Video əlavə edin (istəyə bağlı)",
  onBusyChange,
  maxSizeMB = 50,
}) {
  const initialUrl = (files && files[0]?.url) || (files && typeof files[0] === "string" ? files[0] : "") || value || "";
  const [videoUrl, setVideoUrl] = useState(initialUrl);
  const [audioStatus, setAudioStatus] = useState(null); // "ok" | "none" | "silent" | "dropped"
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const u = (files && files[0]?.url) || (files && typeof files[0] === "string" ? files[0] : "") || value || "";
    setVideoUrl(u);
  }, [files, value]);

  useEffect(() => {
    onBusyChange?.(uploading);
  }, [uploading, onBusyChange]);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Fayl növü yoxlanışı
    if (!file.type.startsWith("video/")) {
      setError("Zəhmət olmasa yalnız video faylı (MP4, WebM, MOV və s.) seçin.");
      return;
    }

    // Telegram Bot API limiti (50 MB)
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Video ölçüsü maksimum ${maxSizeMB} MB ola bilər.`);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(10);

    // Vercel Serverless Function 4.5 MB body limitinə malikdir.
    // Fayl 4 MB-dan böyükdürsə, Vercel 413 xətası verməməsi üçün birbaşa Telegram-a yükləyirik.
    const isLargeFile = file.size > 4 * 1024 * 1024;

    try {
      let finalResult = null;

      if (!isLargeFile) {
        // Kiçik fayllar üçün serverdəki FFmpeg normallaşdırma marşrutunu sınayırıq
        const formData = new FormData();
        formData.append("video", file);

        setUploadProgress(30);

        try {
          const res = await fetch("/api/telegram/upload", {
            method: "POST",
            body: formData,
          });

          // 1) Xətanı təhlükəsiz tuturuq — HTML/text gələrsə JSON oxuyub SyntaxError almırıq
          const contentType = res.headers.get("content-type") || "";
          let data = null;

          if (contentType.includes("application/json")) {
            data = await res.json().catch(() => null);
          } else {
            // HTML və ya "Request Entity Too Large" mətnidir
            const textResponse = await res.text().catch(() => "");
            if (res.status === 413 || textResponse.includes("Request Entity Too Large")) {
              console.warn("Vercel 4.5 MB limitinə düşdü, birbaşa Telegram yükləməsinə keçilir...");
              // 413 halında aşağıdakı birbaşa yükləmə blokuna keçəcək
              data = null;
            } else {
              throw new Error(`Server xətası (${res.status}): ${textResponse.slice(0, 100)}`);
            }
          }

          if (res.ok && data?.success) {
            finalResult = {
              videoUrl: data.url,
              audio: data.audio || "ok",
            };
          }
        } catch (serverErr) {
          console.warn("Server upload xətası, birbaşa yükləməyə keçilir:", serverErr.message);
        }
      }

      // Əgər fayl > 4 MB idisə və ya server 413 qaytardısa: birbaşa Telegram API-yə yükləyirik
      if (!finalResult) {
        setUploadProgress(20);

        // Telegram kanal ID-sini konfiqurasiyadan alırıq
        let targetChatId = "";
        try {
          const cfgRes = await fetch("/api/telegram/config");
          const cfg = await cfgRes.json();
          targetChatId = cfg.chatId;
        } catch {
          // fallback
        }

        if (!targetChatId) {
          targetChatId = "@mulkera_media";
        }

        const directData = await uploadDirectlyToTelegram(file, targetChatId, (pct) => {
          setUploadProgress(Math.max(20, pct));
        });

        finalResult = {
          videoUrl: directData.videoUrl,
          audio: directData.audio || "ok",
        };
      }

      const finalUrl = finalResult.videoUrl;
      setVideoUrl(finalUrl);
      setAudioStatus(finalResult.audio);
      setUploadProgress(100);

      if (setFiles) {
        setFiles([{ url: finalUrl, name: file.name, type: "video" }]);
      }
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
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  };

  const handleRemove = () => {
    setVideoUrl("");
    setAudioStatus(null);
    setError(null);
    if (setFiles) {
      setFiles([]);
    }
    onChange?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <FiVideo className="text-copper" /> {label}
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
                <span>Audio bütövlüyü təmin edildi (Video hazırdır və yayımlanır)</span>
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
                <FiVolume2 className="text-slate-500 text-sm shrink-0" />
                <span>Video hazırdır və yayımlanır</span>
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
                Video Telegram buluduna yüklənir...
              </p>
              <div className="w-52 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-copper h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {uploadProgress}%
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
                ⚡ Telegram Cloud Storage vasitəsilə limitsiz və pulsuz saxlanılır
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
