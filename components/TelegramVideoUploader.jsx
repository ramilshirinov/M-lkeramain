"use client";

import { useState, useRef } from "react";
import { FiVideo, FiUploadCloud, FiTrash2, FiCheckCircle, FiAlertCircle, FiLoader } from "react-icons/fi";

export default function TelegramVideoUploader({
  value,
  onChange,
  chatId = "",
  maxSizeMB = 50,
}) {
  const [videoUrl, setVideoUrl] = useState(value || "");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Zəhmət olmasa yalnız video faylı (MP4, WebM, MOV) seçin.");
      return;
    }

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
      if (chatId) formData.append("chat_id", chatId);

      setUploadProgress(50);

      const res = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Video yüklənərkən xəta baş verdi.");
      }

      const finalUrl = data.data.videoUrl;
      setVideoUrl(finalUrl);
      setUploadProgress(100);
      onChange?.(finalUrl);
    } catch (err) {
      console.error("Video upload error:", err);
      setError(err.message || "Videonu Telegram-a yükləmək mümkün olmadı.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setVideoUrl("");
    setError(null);
    onChange?.(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <FiVideo className="text-copper" /> Əmlak Videosu (Telegram Cloud Storage)
        </label>
        <span className="text-xs text-slate-500">Maks. {maxSizeMB} MB</span>
      </div>

      {videoUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black aspect-video shadow-md">
          <video src={videoUrl} controls playsInline className="w-full h-full object-contain">
            Brauzeriniz video pleyeri dəstəkləmir.
          </video>

          <div className="absolute top-3 right-3 flex items-center gap-2">
            <span className="bg-emerald-600/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
              <FiCheckCircle /> Yükləndi
            </span>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 bg-red-600/90 hover:bg-red-700 text-white rounded-full transition shadow-md cursor-pointer"
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
            isDragOver ? "border-copper bg-copper/5" : "border-slate-300 dark:border-slate-700 hover:border-copper/70"
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
                Video Telegram kanalına yüklənir...
              </p>
              <div className="w-48 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-copper h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-copper/10 text-copper flex items-center justify-center text-2xl mb-1">
                <FiUploadCloud />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Videonu buraya sürükləyin və ya <span className="text-copper underline">fayl seçin</span>
              </p>
              <p className="text-xs text-slate-500">MP4, MOV, WebM (Maksimum {maxSizeMB} MB)</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900/50">
          <FiAlertCircle className="shrink-0 text-base" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
