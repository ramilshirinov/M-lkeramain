"use client";

import { useState } from "react";
import { FiUpload, FiVideo, FiX, FiLoader } from "react-icons/fi";
import { compressImageFile } from "@/lib/media";

export default function MediaUploader({
  files = [],
  setFiles,
  accept = "image/*",
  type = "image",
  label,
  bucket = "listings",
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    setUploading(true);
    setUploadError("");

    try {
      const uploaded = [];

      for (let file of selected) {
        // 1. Şəkilləri brauzerdə sıxırıq (413 Payload Too Large xətasının qarşısını almaq üçün)
        if (type === "image" && file.type?.startsWith("image/")) {
          try {
            file = await compressImageFile(file, 1920, 1080, 0.8);
          } catch (compErr) {
            console.warn("Şəkil sıxılması xətası:", compErr);
          }
        }

        // 2. FormData ilə Supabase Storage-ə yönləndirilən /api/upload endpointinə göndəririk
        try {
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch(`/api/upload?bucket=${bucket}`, {
            method: "POST",
            body: formData,
          });

          // Təhlükəsiz JSON oxunması (Unexpected token xətalarını aradan qaldırır)
          const text = await res.text();
          let json;
          try {
            json = JSON.parse(text);
          } catch (jsonErr) {
            throw new Error(text.slice(0, 100) || "Server cavab vermədi");
          }

          if (json.success && json.url) {
            uploaded.push({ url: json.url, name: json.name || file.name, type });
          } else {
            throw new Error(json.message || "Fayl yüklənmədi");
          }
        } catch (innerErr) {
          console.error("Yükləmə xətası:", innerErr.message);
          setUploadError(`Fayl yüklənə bilmədi: ${innerErr.message}`);
        }
      }

      if (uploaded.length > 0) {
        setFiles((prev) => [...(prev || []), ...uploaded]);
      }
    } catch (err) {
      console.error("Media yükləmə xətası:", err);
      setUploadError("Fayl yüklənərkən xəta baş verdi.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => (prev || []).filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-semibold text-navy dark:text-slate-200">
          {label}
        </label>
      )}

      <div className="flex flex-wrap gap-4">
        {(files || []).map((file, index) => {
          const url = typeof file === "string" ? file : file?.url;
          return (
            <div
              key={`${url}-${index}`}
              className="relative h-24 w-24 overflow-hidden rounded-xl border border-navy/10 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {type === "video" ? (
                <video src={url} className="h-full w-full object-cover" muted />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={url} alt="Yüklənmiş fayl" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label="Faylı sil"
                className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-xs text-white transition-all hover:bg-red-600 shadow cursor-pointer"
              >
                <FiX />
              </button>
            </div>
          );
        })}

        <label
          className={`flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-navy/20 bg-slate-50 text-navy/60 transition-all hover:border-copper hover:bg-copper/5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-copper dark:hover:bg-slate-700 ${
            uploading ? "cursor-wait opacity-60" : "cursor-pointer"
          }`}
        >
          {uploading ? (
            <FiLoader className="mb-1 animate-spin text-xl text-copper" />
          ) : type === "video" ? (
            <FiVideo className="mb-1 text-xl text-copper" />
          ) : (
            <FiUpload className="mb-1 text-xl text-copper" />
          )}
          <span className="px-1 text-center text-[10px] font-medium">
            {uploading ? "Sıxılır və yüklənir..." : type === "video" ? "Video seç" : "Şəkil seç"}
          </span>
          <input
            type="file"
            multiple
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {uploadError && (
        <p className="text-xs font-medium text-red-500 dark:text-red-400">⚠️ {uploadError}</p>
      )}
    </div>
  );
}
