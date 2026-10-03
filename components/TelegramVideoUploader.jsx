"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiVideo,
  FiUploadCloud,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiRefreshCw,
} from "react-icons/fi";

/**
 * Videonu /api/upload-video vasitəsilə Telegram-a yükləyir.
 *
 * Props (listings/add/page.js ilə eyni müqavilə, MediaUploader kimi):
 *   files        : [{ url, name, type: "video" }]
 *   setFiles     : useState setter-i
 *   label        : başlıq (istəyə bağlı)
 *   onBusyChange : (boolean) => void — yükləmə gedərkən true
 *   maxSizeMB    : Telegram stream limiti 20 MB-dır (getFile limiti)
 */

// XMLHttpRequest istifadə edirik ki, REAL yükləmə faizi (upload.onprogress) göstərə bilək.
// Diqqət: Content-Type başlığı ƏL İLƏ yazılmır — brauzer multipart boundary-ni özü əlavə edir.
function sendToServer(file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("video", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload-video");

    xhr.upload.onprogress = (e) => {
      // 0–90%: serverə yükləmə. Qalan hissə Telegram-a ötürülmə üçündür.
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 90));
    };

    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* JSON deyil (məs. HTML xəta səhifəsi) */
      }

      if (xhr.status >= 200 && xhr.status < 300 && data?.success && data.data?.videoUrl) {
        onProgress(100);
        resolve(data.data);
      } else {
        reject(new Error(data?.message || `Video yüklənərkən xəta baş verdi (${xhr.status}).`));
      }
    };

    xhr.onerror = () => reject(new Error("Şəbəkə xətası. İnternet bağlantısını yoxlayın."));
    xhr.onabort = () => reject(new Error("Yükləmə dayandırıldı."));
    xhr.send(fd);
  });
}

export default function TelegramVideoUploader({
  files = [],
  setFiles,
  label,
  onBusyChange,
  maxSizeMB = 20,
}) {
  const [queue, setQueue] = useState([]); // { id, name, file, progress, error }
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const busy = queue.some((q) => !q.error);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const patch = (id, changes) =>
    setQueue((q) => q.map((x) => (x.id === id ? { ...x, ...changes } : x)));

  const runOne = async (item) => {
    patch(item.id, { error: null, progress: 0 });
    try {
      const data = await sendToServer(item.file, (p) => patch(item.id, { progress: p }));
      setFiles?.((prev) => [...(prev || []), { url: data.videoUrl, name: item.name, type: "video" }]);
      setQueue((q) => q.filter((x) => x.id !== item.id));
    } catch (err) {
      console.error("Video upload error:", err);
      patch(item.id, { error: err?.message || "Videonu Telegram-a yükləmək mümkün olmadı." });
    }
  };

  const addFiles = async (fileList) => {
    const picked = Array.from(fileList || []);
    setError(null);

    const items = [];
    for (const file of picked) {
      if (!file.type?.startsWith("video/")) {
        setError("Zəhmət olmasa yalnız video faylı (MP4, WebM, MOV) seçin.");
        continue;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Video ölçüsü maksimum ${maxSizeMB} MB ola bilər.`);
        continue;
      }
      items.push({ id: crypto.randomUUID(), name: file.name, file, progress: 0, error: null });
    }
    if (!items.length) return;

    setQueue((q) => [...q, ...items]);
    for (const item of items) await runOne(item); // ardıcıl yükləyirik
  };

  const removeAt = (i) => setFiles?.((prev) => (prev || []).filter((_, j) => j !== i));

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <FiVideo className="text-copper" /> {label || "Əmlak Videosu"}
        </label>
        <span className="text-xs text-slate-500">Maks. {maxSizeMB} MB</span>
      </div>

      {/* Yüklənmiş videolar */}
      {files.map((f, i) => {
        const url = typeof f === "string" ? f : f?.url;
        if (!url) return null;
        return (
          <div
            key={url}
            className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black aspect-video shadow-md"
          >
            <video src={url} controls playsInline preload="metadata" className="w-full h-full object-contain">
              Brauzeriniz video pleyeri dəstəkləmir.
            </video>

            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className="bg-emerald-600/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                <FiCheckCircle /> Yükləndi
              </span>
              <button
                type="button"
                aria-label="Videonu sil"
                onClick={() => removeAt(i)}
                className="p-2 bg-red-600/90 hover:bg-red-700 text-white rounded-full transition shadow-md cursor-pointer"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}

      {/* Yüklənməkdə olan / xəta verən fayllar */}
      {queue.map((q) => (
        <div
          key={q.id}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate text-slate-700 dark:text-slate-300 font-semibold">
              {q.error ? (
                <FiAlertCircle className="shrink-0 text-red-600" />
              ) : (
                <FiLoader className="shrink-0 text-copper animate-spin" />
              )}
              <span className="truncate">{q.name}</span>
            </span>

            {q.error ? (
              <span className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => runOne(q)}
                  className="flex items-center gap-1 text-red-600 hover:underline cursor-pointer"
                >
                  <FiRefreshCw /> Yenidən
                </button>
                <button
                  type="button"
                  onClick={() => setQueue((all) => all.filter((x) => x.id !== q.id))}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Ləğv et
                </button>
              </span>
            ) : (
              <span className="font-semibold text-copper">
                {q.progress < 90 ? `${q.progress}%` : "Telegram-a göndərilir..."}
              </span>
            )}
          </div>

          <div className="h-1.5 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-1.5 rounded transition-all duration-200 ${q.error ? "bg-red-500" : "bg-copper"}`}
              style={{ width: `${q.progress}%` }}
            />
          </div>

          {q.error && <p className="text-red-600">{q.error}</p>}
        </div>
      ))}

      {/* Yükləmə sahəsi (bir neçə video əlavə etmək üçün həmişə görünür) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
          isDragOver ? "border-copper bg-copper/5" : "border-slate-300 dark:border-slate-700 hover:border-copper/70"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files || []);
            e.target.value = ""; // eyni faylı yenidən seçmək mümkün olsun
            addFiles(picked);
          }}
        />
        <div className="space-y-2 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-copper/10 text-copper flex items-center justify-center text-2xl mb-1">
            <FiUploadCloud />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Videonu buraya sürükləyin və ya <span className="text-copper underline">fayl seçin</span>
          </p>
          <p className="text-xs text-slate-500">MP4, MOV, WebM (Maksimum {maxSizeMB} MB)</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900/50">
          <FiAlertCircle className="shrink-0 text-base" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}