"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import ListingCard from "@/components/ListingCard";
import { FiSearch, FiMapPin } from "react-icons/fi";

// listing_photos, categories və districts sorğuya qoşulur (şəkil problemi buradan həll olunur)
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

  const goSearch = () => {
    router.push(`/listings?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const tabs = [
    { id: "all", label: dict.home?.categories || "Bütün Elanlar" },
    { id: "new-building", label: dict.categories?.["new-building"] || "Yeni tikili" },
    { id: "old-building", label: dict.categories?.["old-building"] || "Köhnə tikili" },
    { id: "house-cottage", label: dict.categories?.["house-cottage"] || "Həyət evi / Bağ evi" },
    { id: "office", label: dict.categories?.office || "Ofis" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-navy dark:text-slate-100">
      {/* Hero Section */}
      <section className="relative bg-white dark:bg-slate-900 text-navy dark:text-slate-100 py-20 px-4 sm:px-6 lg:px-8 text-center overflow-hidden border-b border-navy/10 dark:border-slate-800 shadow-sm">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Sloqan */}
          <span className="inline-block px-4 py-1.5 rounded-full bg-gold-50 dark:bg-slate-800 text-copper text-xs font-semibold tracking-wide uppercase border border-gold/30 shadow-sm">
            {dict.brand || "MÜLKERA"} — {dict.slogan || "Sizin eranız, sizin mülkünüz."}
          </span>

          <h1 className="text-4xl sm:text-6xl font-extrabold font-heading tracking-tight text-navy dark:text-white">
            {dict.home?.heroTitle || "Arzuladığınız Mülkü MÜLKERA ilə Tapın"}
          </h1>

          <p className="text-base sm:text-lg text-navy/70 dark:text-slate-300 max-w-2xl mx-auto font-medium">
            {dict.home?.heroSubtitle ||
              "Bakıda və bölgələrdə elit mənzillər, villalar və kommersiya obyektləri."}
          </p>

          {/* Axtarış qutusu */}
          <div className="p-3 max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-navy/10 dark:border-slate-700">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-navy/10 dark:border-slate-700 text-navy dark:text-slate-100">
              <FiMapPin className="text-copper flex-shrink-0 text-lg" />
              <input
                type="text"
                placeholder={dict.home?.searchPlaceholder || "Şəhər və ya ünvan daxil edin..."}
                className="w-full bg-transparent text-sm outline-none text-navy dark:text-slate-100 placeholder:text-navy/40 dark:placeholder:text-slate-500 font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") goSearch();
                }}
              />
            </div>
            <button
              type="button"
              onClick={goSearch}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-copper shadow-sm"
            >
              <FiSearch /> {dict.home?.searchButton || "Axtar"}
            </button>
          </div>
        </div>
      </section>

      {/* Kateqoriya tabları */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="flex flex-wrap justify-center gap-3">
          {tabs.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                selectedCategory === cat.id
                  ? "bg-navy text-white shadow-card dark:bg-copper"
                  : "bg-white dark:bg-slate-900 text-navy dark:text-slate-200 border border-navy/15 dark:border-slate-700 hover:border-gold hover:text-copper"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Seçilmiş elanlar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-navy dark:text-white">
            {dict.home?.featured || "Seçilmiş Elanlar"}
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
          <div className="p-12 text-center text-navy/55 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-navy/10 dark:border-slate-700 shadow-sm font-medium">
            {dict.home?.noListings || "Hələ ki bu kateqoriyada aktiv elan yoxdur."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}