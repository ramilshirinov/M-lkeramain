"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiSearch,
  FiMapPin,
  FiArrowRight,
  FiKey,
  FiTag,
  FiAward,
  FiCompass,
  FiZap,
  FiCheckCircle,
  FiShield,
} from "react-icons/fi";

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

  const handleTagClick = (tag) => {
    setSearchQuery(tag);
    executeSearch(tag);
  };

  return (
    <section className="relative overflow-hidden bg-white pt-10 pb-12 sm:pt-14 sm:pb-16 border-b border-slate-100 select-none">
      {/* ========================================================================= */}
      {/* ARXA FON: Sumqayıt Dənizkənarı Bulvarı və Müasir Binaların Estetik Panoramı */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/coastal-boulevard.jpg"
          alt="Sumqayıt Dənizkənarı Bulvar"
          className="w-full h-full object-cover object-[center_45%] opacity-25 sm:opacity-30"
        />

        {/* Yumşaq Ağ Qradiyent Örtüyü: Təmiz #FFFFFF ağ fonla zərif vəhdət təmin edir */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/70" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-6 sm:space-y-7">
          
          {/* Məkan və Korporativ Nişan */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cream-50 border border-copper/25 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-copper opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-copper" />
            </span>
            <span className="text-xs font-bold tracking-wide text-copper uppercase">
              MÜLKERA · DAŞINMAZ ƏMLAK AGENTLİYİ
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-medium text-navy/70">
              Sumqayıt & Bakı
            </span>
          </div>

          {/* Əsas Böyük Başlıq və Şüar */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#111827] tracking-tight leading-[1.08] font-heading">
              Sizin eranız,
              <br />
              <span className="text-[#111827]">sizin mülkünüz</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl font-normal leading-relaxed pt-1">
              Azərbaycanda əmlak almaq, satmaq və kirayə vermək üçün etibarlı platforma. Sumqayıt sahili və paytaxtda yoxlanılmış elanlar və lisenziyalı rieltorlar.
            </p>
          </div>

          {/* Sürətli Axtarış Sətri (Təmiz, İşıqlı Kapsul Dizayn) */}
          <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 shadow-xl shadow-slate-200/40 max-w-2xl">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-slate-50/90 rounded-xl border border-slate-200/80 text-navy focus-within:border-copper focus-within:bg-white transition-all">
                <FiMapPin className="text-[#C9743E] text-xl flex-shrink-0" />
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
                className="bg-[#101828] hover:bg-[#1E293B] active:scale-[0.98] text-white px-8 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shrink-0"
              >
                <FiSearch className="text-base" />
                <span>Axtar</span>
              </button>
            </div>

            {/* Populyar Sürətli Açar Sözlər (Tags) */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 px-2 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <span className="font-semibold text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <FiZap className="text-amber-500 text-xs" /> Populyar:
              </span>
              {["Sumqayıt Bulvarı", "Dəniz Panoramalı", "Yeni Tikili", "Kirayə", "Nərimanov"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-copper/10 hover:text-copper text-slate-700 transition-colors text-[11px] font-medium"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Sürətli Bölmə Keçidləri (Kirayə, Satılıq, Rieltorlar Reytinqi, Xəritə) */}
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              Birbaşa Keçidlər:
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* 1. Kirayə */}
              <Link
                href="/listings?type=rent"
                className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-copper/40 text-navy font-semibold text-sm transition-all duration-200 shadow-xs hover:shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FiKey className="text-sm" />
                </div>
                <span>Kirayə Əmlaklar</span>
                <FiArrowRight className="text-slate-400 group-hover:text-copper group-hover:translate-x-0.5 transition-all text-xs" />
              </Link>

              {/* 2. Satılıq */}
              <Link
                href="/listings?type=sale"
                className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-copper text-navy font-semibold text-sm transition-all duration-200 shadow-xs hover:shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-copper/10 text-copper flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FiTag className="text-sm" />
                </div>
                <span>Satılıq Mənzillər</span>
                <FiArrowRight className="text-slate-400 group-hover:text-copper group-hover:translate-x-0.5 transition-all text-xs" />
              </Link>

              {/* 3. Realtorlar Reytinqi */}
              <Link
                href="/realtors"
                className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cream-50 to-white hover:from-cream-100 hover:to-white border border-amber-300 hover:border-gold text-navy font-semibold text-sm transition-all duration-200 shadow-xs hover:shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-gold/20 text-gold-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FiAward className="text-base text-gold-600" />
                </div>
                <span>Rieltorlar Reytinqi</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold/20 text-gold-600">
                  TOP 2026
                </span>
              </Link>

              {/* 4. Xəritə Axtarışı */}
              <Link
                href="/map"
                className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-navy font-medium text-sm transition-all"
              >
                <FiCompass className="text-copper text-sm" />
                <span>Xəritə</span>
              </Link>
            </div>
          </div>

          {/* Metrik Göstəricilər */}
          <div className="pt-3 grid grid-cols-3 gap-6 border-t border-slate-200/80 max-w-lg">
            <div>
              <div className="text-2xl font-black font-heading text-navy">1,500+</div>
              <div className="text-xs text-slate-500 font-medium">Yoxlanılmış Mülk</div>
            </div>
            <div>
              <div className="text-2xl font-black font-heading text-copper">100%</div>
              <div className="text-xs text-slate-500 font-medium">Sumqayıt & Bakı GPS</div>
            </div>
            <div>
              <div className="text-2xl font-black font-heading text-gold-600">4.9 / 5.0</div>
              <div className="text-xs text-slate-500 font-medium">Rieltor Məmnuniyyəti</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
