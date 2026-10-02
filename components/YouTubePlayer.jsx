"use client";

import { useState } from "react";
import { FiPlay } from "react-icons/fi";
import { youtubeEmbedUrl, youtubeThumb } from "@/lib/youtubeUpload";

export default function YouTubePlayer({ videoId, title = "Video", autoPlay = false, className = "" }) {
  const [active, setActive] = useState(autoPlay);
  const [thumbFailed, setThumbFailed] = useState(false);
  if (!videoId) return null;

  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-black ${className}`}>
      {active ? (
        <iframe
          src={youtubeEmbedUrl(videoId, { autoplay: true })}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          aria-label={`${title} — oynat`}
          className="group absolute inset-0 flex items-center justify-center cursor-pointer"
        >
          {thumbFailed ? (
            <span className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={youtubeThumb(videoId)}
              alt=""
              loading="lazy"
              onError={() => setThumbFailed(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <span className="absolute inset-0 bg-black/25 transition group-hover:bg-black/10" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-copper text-white shadow-xl transition group-hover:scale-110">
            <FiPlay className="ml-1 text-2xl" />
          </span>
          {thumbFailed && (
            <span className="absolute bottom-3 left-3 right-3 text-center text-xs text-white/80">
              Video hazırlanır — bir neçə dəqiqə sonra yenidən cəhd edin.
            </span>
          )}
        </button>
      )}
    </div>
  );
}
