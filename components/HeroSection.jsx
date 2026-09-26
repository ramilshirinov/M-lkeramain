"use client";

import { useRouter } from "next/navigation";
import { FiSearch, FiMapPin } from "react-icons/fi";

export default function HeroSection({ searchQuery, setSearchQuery, onSearch }) {
  const router = useRouter();

  const executeSearch = (customQuery) => {
    const q = (customQuery !== undefined ? customQuery : searchQuery) || "";
    if (onSearch) {
      onSearch(q);
    } else {
      router.push(`/listings?search=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-slate-900 py-16 sm:py-24 text-white text-center select-none border-b border-slate-800">
      {/* ========================================================================= */}
      {/* ARXA FON: Sumqayıt Dənizkənarı Panoraması və Tünd Qoruyucu Örtük           */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/sumqayit-real-skyline.jpg"
          alt="Sumqayıt Panoraması"
          className="w-full h-full object-cover object-[center_35%]"
        />
        {/* Tünd zərif örtük - Başlıq və axtarış blokunun kontrastını və oxunaqlığını təmin edir */}
        <div className="absolute inset-0 bg-slate-950/65" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center space-y-6 z-10">
        {/* Üst Kapsul Nişanı */}
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#FFF9F3]/95 border border-amber-200/50 text-[#9A3412] text-xs font-bold tracking-wider uppercase shadow-sm">
          MÜLKERA — SİZİN ERANIZ, SİZİN MÜLKÜNÜZ.
        </div>

        {/* Əsas Böyük Başlıq */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight font-heading leading-tight">
          Sizin eranız, sizin mülkünüz.
        </h1>

        {/* Real Təmiz Şüar (Uydurma Məlumatlar Silindi) */}
        <p className="text-sm sm:text-base text-slate-200 max-w-2xl font-normal leading-relaxed">
          Azərbaycanda əmlak almaq, satmaq və kirayə vermək üçün etibarlı platforma.
        </p>

        {/* Sürətli Axtarış Sətri */}
        <div className="w-full max-w-2xl bg-white rounded-2xl p-2 sm:p-2.5 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border border-white/20">
          <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5 text-slate-700">
            <FiMapPin className="text-[#C9743E] text-xl shrink-0" />
            <input
              type="text"
              placeholder="Rayon, ünvan və ya açar söz axtarın..."
              className="w-full bg-transparent text-sm text-[#111827] placeholder:text-slate-400 outline-none font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") executeSearch();
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-slate-400 hover:text-navy px-1 font-bold"
                title="Təmizlə"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => executeSearch()}
            className="bg-[#101828] hover:bg-[#1E293B] active:scale-[0.98] text-white px-8 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <FiSearch className="text-base" />
            <span>Axtar</span>
          </button>
        </div>
      </div>
    </section>
  );
}
