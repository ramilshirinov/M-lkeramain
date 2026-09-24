"use client";

import { useState } from "react";

const PLACEHOLDER = "/images/placeholder-property.svg";

// Faylın uzantısına görə MIME tipi (.mov faylları H.264 olduqda mp4 kimi oxunur)
function getMime(url = "") {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".webm")) return "video/webm";
  if (clean.endsWith(".ogg") || clean.endsWith(".ogv")) return "video/ogg";
  return "video/mp4";
}

export default function ListingMedia({ media = [], title = "Əmlak" }) {
  const items = Array.isArray(media) ? media.filter((m) => m?.url) : [];
  const images = items.filter((m) => m.media_type !== "video");
  const videos = items.filter((m) => m.media_type === "video");

  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState({});

  const current = images[active];
  const currentSrc =
    !current || failed[current.url] ? PLACEHOLDER : current.url;

  return (
    <div className="space-y-6">
      {/* Şəkil qalereyası */}
      <div className="space-y-3">
        <div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() =>
              current && setFailed((f) => ({ ...f, [current.url]: true }))
            }
          />
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => setActive(i)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  i === active
                    ? "border-copper"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={failed[img.url] ? PLACEHOLDER : img.url}
                  alt={`${title} ${i + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Videolar */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold font-heading text-navy dark:text-slate-100">
            Video
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {videos.map((v) => (
              <video
                key={v.url}
                controls
                preload="metadata"
                playsInline
                className="w-full aspect-video rounded-xl object-cover bg-black"
              >
                <source src={v.url} type={getMime(v.url)} />
                Brauzeriniz video teqini dəstəkləmir.
              </video>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}