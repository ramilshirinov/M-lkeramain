"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { FiSearch, FiMapPin } from "react-icons/fi";

export default function HeroSection({ searchQuery, setSearchQuery, onSearch }) {
  const router = useRouter();
  const { dict: rawDict } = useApp();
  const dict = rawDict || {};

  const executeSearch = () => {
    const q = (searchQuery || "").trim();
    if (onSearch) {
      onSearch(q);
    } else {
      router.push(`/listings?search=${encodeURIComponent(q)}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-white pt-12 pb-14 sm:pt-16 sm:pb-20 border-b border-slate-100">
      {/* ========================================================================= */}
      {/* ARXA FON: Sumqayıt Dənizkənarı Bulvarının İşıqlı və Zərif Panoramı        */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/coastal-boulevard.jpg"
          alt="Sumqayıt Dənizkənarı Bulvar"
          className="w-full h-full object-cover object-[center_45%] opacity-20 sm:opacity-25"
        />
        {/* Yumşaq Ağ Qradiyent Örtüyü: Təmiz #FFFFFF ağ fonla qovuşur */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/60" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-6 text-left">
          
          {/* Əsas Orijinal Başlıq və Şüar */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-navy tracking-tight leading-[1.08] font-heading">
              {dict.home?.heroTitle || "Sizin eranız, sizin mülkünüz."}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl font-normal leading-relaxed">
              {dict.home?.heroSubtitle ||
                "Azərbaycanda əmlak almaq, satmaq və kirayə vermək üçün etibarlı platforma."}
            </p>
          </div>

          {/* Əsas Axtarış Sətri */}
          <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200 shadow-xl shadow-slate-200/50 max-w-2xl">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-slate-50/90 rounded-xl border border-slate-200 text-navy focus-within:border-copper focus-within:bg-white transition-all">
                <FiMapPin className="text-copper text-xl flex-shrink-0" />
                <input
                  type="text"
                  placeholder={
                    dict.home?.searchPlaceholder || "Rayon, ünvan və ya açar söz axtarın..."
                  }
                  className="w-full bg-transparent text-sm text-navy placeholder:text-slate-400 outline-none font-medium"
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
                onClick={executeSearch}
                className="bg-navy hover:bg-copper active:scale-[0.98] text-white px-8 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shrink-0"
              >
                <FiSearch className="text-base" />
                <span>{dict.home?.searchButton || "Axtar"}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
