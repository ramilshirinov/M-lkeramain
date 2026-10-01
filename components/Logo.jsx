"use client";

import Link from "next/link";

export default function Logo({
  variant = "full", // "full", "icon", "simple"
  className = "",
  showTagline = true,
  href = "/",
}) {
  const content = (
    <div className={`flex items-center gap-3 select-none group ${className}`}>
      {/* M-House Emblem (Vector SVG with Dark/Light Mode Adaptability) */}
      <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center transition-transform group-hover:scale-105">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main House Body with inner 'V' creating M letter */}
          <path
            d="M 50 14
               L 12 40
               L 12 94
               L 34 94
               L 34 52
               L 50 66
               L 66 52
               L 66 94
               L 88 94
               L 88 40
               Z"
            className="fill-navy dark:fill-white transition-colors duration-200"
          />
          {/* Door on right pillar (cutout adapts to theme) */}
          <rect
            x="72"
            y="70"
            width="11"
            height="22"
            rx="1.5"
            className="fill-white dark:fill-slate-900 transition-colors duration-200"
          />
          {/* Window pane inside door */}
          <rect
            x="74"
            y="72.5"
            width="7"
            height="7.5"
            rx="1"
            className="fill-navy dark:fill-white transition-colors duration-200"
          />
        </svg>
      </div>

      {/* Typography */}
      {variant !== "icon" && (
        <div className="flex flex-col min-w-0">
          <div className="text-xl sm:text-2xl font-black tracking-wider font-heading leading-none flex items-center">
            <span className="text-navy dark:text-white transition-colors duration-200">
              MÜLK
            </span>
            <span className="text-[#C59B27] dark:text-[#D4AF37] transition-colors duration-200">
              ERA
            </span>
          </div>

          <span className="text-[8.5px] sm:text-[9px] font-extrabold tracking-widest text-navy/80 dark:text-slate-300 uppercase mt-0.5 whitespace-nowrap">
            ƏMLAK SATIŞI AGENTLİYİ
          </span>

          {showTagline && (
            <span className="text-[9.5px] sm:text-[10px] text-navy/60 dark:text-slate-400 font-medium tracking-tight whitespace-nowrap hidden sm:inline">
              Sizin eranız, sizin mülkünüz.
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
