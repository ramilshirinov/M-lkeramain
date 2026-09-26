"use client";

import { useState } from "react";
import { FiUpload, FiVideo, FiX, FiLoader } from "react-icons/fi";

async function compressImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        resolve(event.target.result);
      };
    };
    reader.onerror = () => {
      resolve("");
    };
  });
}

export default function MediaUploader({
  files = [],
  setFiles,
  accept = "image/*",
  type = "image",
  label,
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

      for (const file of selected) {
        // Faylı base64 DataURL-ə çeviririk və ya FormData ilə /api/upload-a göndəririk
        try {
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          let json = null;
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            try {
              json = await res.json();
            } catch (e) {
              json = null;
            }
          }

          if (res.ok && json?.success && json?.url) {
            uploaded.push({ url: json.url, name: json.name || file.name, type });
          } else {
            // Standard fallback if server fails or returns Data URL
            const compressedUrl = await compressImageFile(file);
            uploaded.push({ url: compressedUrl, name: file.name, type });
          }
        } catch (innerErr) {
          // Fallback FileReader with compression
          const dataUrl = await compressImageFile(file);
          uploaded.push({ url: dataUrl, name: file.name, type });
        }
      }

      setFiles((prev) => [...(prev || []), ...uploaded]);
    } catch (err) {
      console.error("Yükləmə xətası:", err);
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
                className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-xs text-white transition-all hover:bg-red-600 shadow"
              >
                <FiX />
              </button>
            </div>
          );
        })}

        <label
          className={`flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-navy/20 bg-slate-50 text-navy/60 transition-all hover:border-gold hover:bg-gold-50/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-copper dark:hover:bg-slate-700 ${
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
            {uploading ? "Yüklənir..." : type === "video" ? "Video seç" : "Şəkil seç"}
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
