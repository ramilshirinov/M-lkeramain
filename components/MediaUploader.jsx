"use client";

import { useEffect, useState } from "react";
import { FiUpload, FiVideo, FiX, FiRefreshCw } from "react-icons/fi";
import { uploadMedia } from "@/lib/upload";
import { useApp } from "@/context/AppContext";

export default function MediaUploader({
  files = [],
  setFiles,
  type = "image",
  bucket = "listings",
  label,
  onBusyChange,
}) {
  const { user, t } = useApp();
  const [queue, setQueue] = useState([]); // {id, name, file, progress, error}
  const busy = queue.some((q) => !q.error);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const runOne = async (item) => {
    setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, error: null, progress: 0 } : x)));
    try {
      const res = await uploadMedia(item.file, {
        bucket,
        userId: user?.id || "guest",
        onProgress: (p) =>
          setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, progress: p } : x))),
      });
      setFiles((prev) => [...(prev || []), { url: res.url, name: res.name, type }]);
      setQueue((q) => q.filter((x) => x.id !== item.id));
    } catch (e) {
      console.error("upload error:", e);
      setQueue((q) =>
        q.map((x) => (x.id === item.id ? { ...x, error: e?.message || "Yükləmə xətası" } : x))
      );
    }
  };

  const onPick = async (e) => {
    const items = Array.from(e.target.files || []).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      file,
      progress: 0,
      error: null,
    }));
    e.target.value = "";
    setQueue((q) => [...q, ...items]);
    const pool = [...items]; // max 3 concurrent
    await Promise.all(
      Array.from({ length: Math.min(3, pool.length) }, async () => {
        while (pool.length) await runOne(pool.shift());
      })
    );
  };

  const removeLabel = t?.common?.remove || "Sil";
  const pickPhotoLabel = t?.upload?.pickImage || "Şəkil seç";
  const pickVideoLabel = t?.upload?.pickVideo || "Video seç";
  const retryLabel = t?.upload?.retry || "Yenidən";

  return (
    <div className="space-y-3">
      {label && <label className="block text-sm font-semibold text-navy dark:text-slate-200">{label}</label>}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {files.map((f, i) => (
          <div
            key={f.url || i}
            className="relative aspect-square overflow-hidden rounded-xl border border-navy/15 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
          >
            {type === "video" ? (
              <video
                src={f.url}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            )}
            <button
              type="button"
              aria-label={removeLabel}
              onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 transition shadow cursor-pointer"
            >
              <FiX className="text-xs" />
            </button>
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-navy/20 dark:border-slate-700 hover:border-copper text-xs text-navy/70 dark:text-slate-400 hover:text-copper transition">
          {type === "video" ? <FiVideo className="mb-1 text-xl" /> : <FiUpload className="mb-1 text-xl" />}
          <span className="text-center px-1">{type === "video" ? pickVideoLabel : pickPhotoLabel}</span>
          <input
            type="file"
            multiple
            hidden
            accept={type === "video" ? "video/*" : "image/*"}
            onChange={onPick}
          />
        </label>
      </div>

      {queue.map((q) => (
        <div key={q.id} className="rounded-lg border border-navy/10 dark:border-slate-700 p-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate max-w-[200px] text-navy dark:text-slate-200">{q.name}</span>
            {q.error ? (
              <button
                type="button"
                onClick={() => runOne(q)}
                className="flex items-center gap-1 text-red-600 hover:underline cursor-pointer"
              >
                <FiRefreshCw /> {retryLabel}
              </button>
            ) : (
              <span className="font-semibold text-copper">{q.progress}%</span>
            )}
          </div>
          <div className="mt-1 h-1.5 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-1.5 rounded transition-all duration-200 ${
                q.error ? "bg-red-500" : "bg-copper"
              }`}
              style={{ width: `${q.progress}%` }}
            />
          </div>
          {q.error && <p className="mt-1 text-red-600">{q.error}</p>}
        </div>
      ))}
    </div>
  );
}