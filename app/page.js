"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import ListingCard from "@/components/ListingCard";
import HeroSection from "@/components/HeroSection";
import {
  FiCpu,
  FiZap,
  FiArrowRight,
  FiCheckCircle,
  FiRadio,
} from "react-icons/fi";

// listing_photos, categories və districts sorğuya qoşulur
const SELECT_ALL = "*, listing_photos(url, media_type), categories(*), districts(*)";
// Kateqoriyaya görə filtr üçün !inner join istifadə olunur
const SELECT_BY_CATEGORY =
  "*, listing_photos(url, media_type), categories!inner(*), districts(*)";

export default function HomePage() {
  const { supabase, dict: rawDict } = useApp();
  const dict = rawDict || {};
  const router = useRouter();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    const fetchListings = async () => {
      setLoading(true);
      let query = supabase
        .from("listings")
        .select(selectedCategory === "all" ? SELECT_ALL : SELECT_BY_CATEGORY)
        .order("is_vip", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);

      if (selectedCategory !== "all") {
        query = query.eq("categories.slug", selectedCategory);
      }

      const { data, error } = await query;
      if (cancelled) return;
      if (error) console.error("Elanlar yüklənmədi:", error.message);
      setListings(data || []);
      setLoading(false);
    };

    fetchListings();
    return () => {
      cancelled = true;
    };
  }, [supabase, selectedCategory]);

  const goSearch = (customQuery) => {
    const q = customQuery !== undefined ? customQuery : searchQuery;
    router.push(`/listings?search=${encodeURIComponent((q || "").trim())}`);
  };

  // Kateqoriyalar — İstifadəçinin göndərdiyi image.png dizaynı ilə 1:1 eyni
  const tabs = [
    { id: "all", label: "Kateqoriyalar" },
    { id: "new-building", label: "Yeni tikili" },
    { id: "old-building", label: "Köhnə tikili" },
    { id: "house-cottage", label: "Həyət evi/Bağ evi" },
    { id: "office", label: "Ofis" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-navy dark:text-slate-100">
      {/* Hero Section (İstifadəçinin təqdim etdiyi Sumqayıt şəkli, tünd örtük və təmiz başlıq) */}
      <HeroSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={goSearch}
      />

      {/* Kateqoriya tabları (image.png-dəki kimi zərif kapsul düymələr) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex flex-wrap justify-center gap-3">
          {tabs.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-[#1E293B] text-white shadow-md"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:text-navy dark:hover:text-white shadow-xs"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Seçilmiş elanlar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#111827] dark:text-white">
            {dict.home?.featured || "Seçilmiş elanlar"}
          </h2>
          <Link href="/listings" className="text-copper font-semibold text-sm hover:underline">
            {dict.home?.viewAll || "Hamısına bax"} &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-slate-200/70 dark:bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-navy/10 dark:border-slate-800 shadow-sm space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-copper/10 text-copper flex items-center justify-center mx-auto text-2xl">
              🏠
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-navy dark:text-white">
                Hələ heç bir elan yerləşdirilməyib
              </h3>
              <p className="text-xs text-navy/60 dark:text-slate-400">
                Sistemə ilk real əmlak elanını siz əlavə edərək alıcılara təqdim edin.
              </p>
            </div>
            <Link
              href="/listings/add"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-navy text-white hover:bg-copper text-xs font-bold transition shadow-sm"
            >
              <span>+</span> İlk Elanı Yerləşdir
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* İNNOVASİYALAR: Canlı Peyk & AI Rieltor (Kvadrat Çərçivə - Tezliklə)         */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-copper">
              Gözlənilən İnnovasiyalar
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-heading text-navy dark:text-white">
              Tezliklə MÜLKERA Platformasında
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Yeni nəsil əmlak texnologiyaları hazırlanır
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Canlı Yayım & Rieltor PK (Kvadrat Çərçivə - Gözalımlı Mavi) */}
          <div className="relative group rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white p-7 sm:p-8 border border-blue-500/40 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="absolute -right-16 -top-16 w-52 h-52 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl font-black border border-blue-400/30 shadow-inner">
                  📹
                </div>
                <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-blue-500/25 border border-blue-400/40 text-blue-200 text-xs font-bold uppercase tracking-wider shadow-xs">
                  Tezliklə • Coming Soon
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black font-heading text-white">
                  Canlı Əmlak Yayımı & PK Arenası
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-normal">
                  TikTok formatında canlı video yayımlar — peşəkar rieltorlar mülkləri canlı yayımda nümayiş etdirir, alıcılar sual verir, mənzili gəzir və canlı duel (PK) ilə ən yaxşı təkliflər seçilir.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-blue-200">
                <span className="px-2.5 py-1 rounded-lg bg-blue-900/60 border border-blue-800">
                  📹 Canlı Video Gəzinti
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-900/60 border border-blue-800">
                  ⚔️ Rieltor PK Döyüşü
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-900/60 border border-blue-800">
                  💬 Canlı Çat & Təklif
                </span>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <Link
                href="/live"
                className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Canlı Yayım Barədə Məlumat Al & Qoşul</span>
                <FiArrowRight />
              </Link>
            </div>
          </div>

          {/* 2. AI Rieltor (Kvadrat Çərçivə) */}
          <div className="relative group rounded-3xl bg-gradient-to-br from-slate-900 to-amber-950 text-white p-7 sm:p-8 border border-orange-500/30 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-2xl border border-orange-400/30 shadow-inner">
                  <FiCpu />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 text-xs font-bold uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                  Tezliklə • Coming Soon
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black font-heading text-white">
                  AI Rieltor — Süni İntellektlə Axtarış
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-normal">
                  Süni intellekt köməkçisi ilə təbii söhbət dilində danışaraq istədiyiniz büdcədə, məkanda və parametrə uyğun mülkləri dərhal tapın və bazar dəyərini saniyələr içində təhlil edin.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-amber-200">
                <span className="px-2.5 py-1 rounded-lg bg-orange-950/70 border border-orange-900/60">
                  💬 Səsli & Mətn Dialoq
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-orange-950/70 border border-orange-900/60">
                  📊 Bazar Qiymət Təhlili
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-orange-950/70 border border-orange-900/60">
                  🎯 Dəqiq Eşləşmə
                </span>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <Link
                href="/ai-realtor"
                className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Tezliklə Məlumatı & Gözləmə Siyahısı</span>
                <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Haqqımızda (About Us) Video Bölməsi */}
      <section className="bg-white dark:bg-slate-900 border-t border-navy/10 dark:border-slate-800 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-copper/10 text-copper uppercase tracking-wider">
              {dict.about?.tag || "Haqqımızda & Platforma Təqdimatı"}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-heading text-navy dark:text-white leading-tight">
              Sizin mülkünüz, Azərbaycanda əmlak almaq, satmaq və kirayə vermək üçün etibarlı platforma
            </h2>
            <p className="text-sm text-navy/70 dark:text-slate-300 leading-relaxed font-medium">
              MÜLKERA — peşəkar agentlik standartlarına cavab verən, lisenziyalı rieltorları və etibarlı əmlak sahiblərini alıcılar ilə birləşdirən müasir daşınmaz əmlak ekosistemidir. Virtual canlı təqdimatlar, dəqiq interaktiv xəritə və şəffaf reytinq alqoritmi ilə xidmətinizdəyik.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                href="/listings"
                className="px-6 py-3 rounded-xl bg-navy text-white hover:bg-copper font-bold text-xs transition shadow-sm"
              >
                {dict.home?.viewAll || "Elanları kəşf et"}
              </Link>
              <Link
                href="/realtors"
                className="px-6 py-3 rounded-xl border border-navy/15 dark:border-slate-700 font-bold text-xs text-navy dark:text-slate-200 hover:border-copper hover:text-copper transition"
              >
                Top Rieltorlarımız
              </Link>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-navy/10 dark:border-slate-800 group bg-slate-900">
            <div className="aspect-video w-full relative flex items-center justify-center">
              <video
                controls
                playsInline
                poster="/images/sumqayit-real-skyline.jpg"
                className="w-full h-full object-cover"
              >
                <source src="/videos/mulkera-promo.mp4" type="video/mp4" />
                Brauzeriniz video pleyeri dəstəkləmir.
              </video>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}