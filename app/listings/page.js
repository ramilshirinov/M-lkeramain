"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { fetchCategories, fetchDistricts, localizedField } from "@/lib/listings";
import ListingCard from "@/components/ListingCard";
import { PROPERTY_CATEGORIES } from "@/constants/categories";
import { AZERBAIJAN_REGIONS } from "@/constants/locations";
import {
  FiSearch,
  FiFilter,
  FiMapPin,
  FiRotateCcw,
  FiSliders,
  FiGrid,
  FiChevronDown,
} from "react-icons/fi";

function ListingsContent() {
  const { supabase, locale, language, dict: rawDict } = useApp();
  const dict = rawDict || {};
  const currentLocale = locale || language || "az";
  const searchParams = useSearchParams();
  const router = useRouter();

  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filtrlər
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [txType, setTxType] = useState(searchParams.get("type") || "all");
  
  // Əmlak növü və "Digər"
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "all"
  );
  const [otherCategory, setOtherCategory] = useState("");

  // Dinamik Ərazi İyerarxiyası (Şəhər -> Rayon -> Qəsəbə) və "Digər"
  const [selectedRegionId, setSelectedRegionId] = useState("all");
  const [otherCity, setOtherCity] = useState("");
  
  const [selectedDistrictId, setSelectedDistrictId] = useState("all");
  const [otherDistrict, setOtherDistrict] = useState("");

  const [selectedSettlement, setSelectedSettlement] = useState("all");
  const [otherSettlement, setOtherSettlement] = useState("");

  // Digər filtrlər
  const [rooms, setRooms] = useState(searchParams.get("rooms") || "all");
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");
  
  // Torpaq sahəsi (sot) filtri
  const [minLandSot, setMinLandSot] = useState(searchParams.get("min_sot") || "");
  const [maxLandSot, setMaxLandSot] = useState(searchParams.get("max_sot") || "");

  const [sortBy, setSortBy] = useState("newest");

  // Seçilmiş region obyektini tapmaq
  const activeRegion = useMemo(() => {
    return AZERBAIJAN_REGIONS.find((r) => r.id === selectedRegionId) || null;
  }, [selectedRegionId]);

  // Seçilmiş rayona uyğun qəsəbələr
  const activeDistrict = useMemo(() => {
    if (!activeRegion) return null;
    return activeRegion.districts.find((d) => d.id === selectedDistrictId) || null;
  }, [activeRegion, selectedDistrictId]);

  // Kateqoriya və Rayonların yüklənməsi
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.length > 0) setCategories(json.data);
        else setCategories(PROPERTY_CATEGORIES);
      })
      .catch(() => setCategories(PROPERTY_CATEGORIES));

    fetch("/api/districts")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setDistricts(json.data);
      })
      .catch(() => {});
  }, []);

  // Elanların yüklənməsi
  useEffect(() => {
    let cancelled = false;

    const loadListings = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/listings?type=${txType}&sort=${sortBy}`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.data) {
            setListings(json.data);
            setLoading(false);
            return;
          }
        }

        // Fallback: Supabase sorğusu
        if (supabase) {
          let query = supabase
            .from("listings")
            .select("*, listing_photos(url, media_type), categories(*), districts(*)");

          if (txType !== "all") {
            if (txType === "rent") {
              query = query.neq("transaction_type", "sale");
            } else {
              query = query.eq("transaction_type", txType);
            }
          }

          if (sortBy === "price_asc") {
            query = query.order("price", { ascending: true });
          } else if (sortBy === "price_desc") {
            query = query.order("price", { ascending: false });
          } else {
            query = query.order("is_vip", { ascending: false }).order("created_at", { ascending: false });
          }

          const { data, error } = await query;
          if (cancelled) return;
          if (error) {
            console.error("Elanlar yüklənmədi:", error.message);
          } else {
            setListings(data || []);
          }
        }
      } catch (err) {
        console.error("Xəta baş verdi:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadListings();

    return () => {
      cancelled = true;
    };
  }, [supabase, txType, sortBy]);

  // Client-side axtarış və detallı filtrləmə
  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      // 1. Mətn axtarışı (başlıq və ya ünvan)
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const title = (localizedField(l, "title", currentLocale) || l.title || "").toLowerCase();
        const address = (l.address || "").toLowerCase();
        const desc = (localizedField(l, "description", currentLocale) || l.description || "").toLowerCase();
        if (!title.includes(term) && !address.includes(term) && !desc.includes(term)) {
          return false;
        }
      }

      // 2. Kateqoriya və "Digər"
      if (selectedCategory !== "all") {
        if (selectedCategory === "other") {
          if (otherCategory.trim()) {
            const oc = otherCategory.toLowerCase().trim();
            const catName = (l.categories?.name || l.property_type || "").toLowerCase();
            if (!catName.includes(oc)) return false;
          }
        } else {
          const catMatch =
            String(l.category_id) === selectedCategory ||
            l.categories?.slug === selectedCategory ||
            String(l.property_type).toLowerCase() === selectedCategory.toLowerCase();
          if (!catMatch) return false;
        }
      }

      // 3. Ərazi İyerarxiyası: Şəhər / Region
      if (selectedRegionId !== "all") {
        if (selectedRegionId === "other") {
          if (otherCity.trim()) {
            const cityTerm = otherCity.toLowerCase().trim();
            const addr = (l.address || "").toLowerCase();
            const dist = (l.districts?.name || l.district_name || "").toLowerCase();
            if (!addr.includes(cityTerm) && !dist.includes(cityTerm)) return false;
          }
        } else if (activeRegion) {
          const regionName = activeRegion.name.toLowerCase();
          const addr = (l.address || "").toLowerCase();
          const dist = (l.districts?.name || l.district_name || "").toLowerCase();
          const matchesRegion = addr.includes(regionName) || dist.includes(regionName) || (selectedRegionId === "baku" && (dist.includes("rayon") || addr.includes("bakı")));
          if (!matchesRegion) return false;
        }
      }

      // 4. Ərazi İyerarxiyası: Rayon
      if (selectedDistrictId !== "all") {
        if (selectedDistrictId === "other") {
          if (otherDistrict.trim()) {
            const distTerm = otherDistrict.toLowerCase().trim();
            const addr = (l.address || "").toLowerCase();
            const dist = (l.districts?.name || l.district_name || "").toLowerCase();
            if (!addr.includes(distTerm) && !dist.includes(distTerm)) return false;
          }
        } else if (activeDistrict) {
          const dName = activeDistrict.name.toLowerCase().replace(" rayonu", "").replace(" şəhəri", "");
          const addr = (l.address || "").toLowerCase();
          const dist = (l.districts?.name || l.district_name || "").toLowerCase();
          if (!addr.includes(dName) && !dist.includes(dName)) return false;
        }
      }

      // 5. Ərazi İyerarxiyası: Qəsəbə / Mikrorayon
      if (selectedSettlement !== "all") {
        if (selectedSettlement === "other") {
          if (otherSettlement.trim()) {
            const settTerm = otherSettlement.toLowerCase().trim();
            const addr = (l.address || "").toLowerCase();
            if (!addr.includes(settTerm)) return false;
          }
        } else {
          const settTerm = selectedSettlement.toLowerCase();
          const addr = (l.address || "").toLowerCase();
          if (!addr.includes(settTerm)) return false;
        }
      }

      // 6. Otaq sayı
      if (rooms !== "all") {
        const rc = Number(l.room_count || l.rooms || 0);
        if (rooms === "4+" ? rc < 4 : rc !== Number(rooms)) {
          return false;
        }
      }

      // 7. Qiymət aralığı
      if (minPrice && Number(l.price) < Number(minPrice)) return false;
      if (maxPrice && Number(l.price) > Number(maxPrice)) return false;

      // 8. Torpaq sahəsi (sot və ya m2)
      const landSot = Number(l.yard_sot || l.land_area_sot || (l.area_m2 ? l.area_m2 / 100 : 0));
      if (minLandSot && landSot < Number(minLandSot)) return false;
      if (maxLandSot && landSot > Number(maxLandSot)) return false;

      return true;
    });
  }, [
    listings,
    search,
    selectedCategory,
    otherCategory,
    selectedRegionId,
    otherCity,
    selectedDistrictId,
    otherDistrict,
    selectedSettlement,
    otherSettlement,
    activeRegion,
    activeDistrict,
    rooms,
    minPrice,
    maxPrice,
    minLandSot,
    maxLandSot,
    currentLocale
  ]);

  const handleReset = () => {
    setSearch("");
    setTxType("all");
    setSelectedCategory("all");
    setOtherCategory("");
    setSelectedRegionId("all");
    setOtherCity("");
    setSelectedDistrictId("all");
    setOtherDistrict("");
    setSelectedSettlement("all");
    setOtherSettlement("");
    setRooms("all");
    setMinPrice("");
    setMaxPrice("");
    setMinLandSot("");
    setMaxLandSot("");
    setSortBy("newest");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-navy dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Səhifə Başlığı və Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy/10 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-navy dark:text-white">
              Bütün Elanlar
            </h1>
            <p className="text-sm text-navy/60 dark:text-slate-400 mt-1 font-medium">
              Azərbaycanın bütün şəhər, rayon və qəsəbələrində dəqiq ərazi iyerarxiyası ilə axtarış
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className="md:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-navy/15 dark:border-slate-700 text-sm font-semibold text-navy dark:text-slate-200 shadow-sm"
            >
              <FiFilter className="text-copper" /> {showFilters ? "Filtrləri gizlə" : "Filtrlər"}
            </button>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-navy/15 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold">
              <span className="text-navy/50 dark:text-slate-400">Sırala:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent outline-none text-navy dark:text-slate-100 font-bold cursor-pointer"
              >
                <option value="newest" className="bg-white dark:bg-slate-900">Ən yeni elanlar</option>
                <option value="price_asc" className="bg-white dark:bg-slate-900">Qiymət: Ucuzdan bahaya</option>
                <option value="price_desc" className="bg-white dark:bg-slate-900">Qiymət: Bahadan ucuza</option>
              </select>
            </div>
          </div>
        </div>

        {/* Əsas Genişləndirilmiş Filtr Paneli */}
        <div
          className={`bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-card border border-navy/10 dark:border-slate-800 space-y-5 ${
            showFilters ? "block" : "hidden md:block"
          }`}
        >
          {/* 1-ci Sıra: Açar söz, Əməliyyat və Əmlak növü */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Axtarış sahəsi */}
            <div className="relative">
              <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1.5">
                Açar Söz və ya Ünvan
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700">
                <FiSearch className="text-copper shrink-0" />
                <input
                  type="text"
                  placeholder="Məsələn: 28 May, dəniz mənzərəsi, həyət evi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-xs outline-none text-navy dark:text-slate-100 placeholder:text-navy/40 dark:placeholder:text-slate-500 font-medium"
                />
              </div>
            </div>

            {/* Əməliyyat növü */}
            <div>
              <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1.5">
                Əməliyyat Növü
              </label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none font-semibold cursor-pointer"
              >
                <option value="all">Hamısı (Satış və Kirayə)</option>
                <option value="sale">Satış</option>
                <option value="rent">Kirayə</option>
                <option value="daily">Günlük</option>
              </select>
            </div>

            {/* Əmlak növü (Digər variantı ilə) */}
            <div>
              <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1.5">
                Əmlak Növü
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none font-semibold cursor-pointer"
              >
                <option value="all">Bütün Əmlak Növləri</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {localizedField(c, "name", currentLocale) || c.name || c.name_az}
                  </option>
                ))}
                <option value="other">✍️ Digər (Əl ilə daxil et)</option>
              </select>

              {selectedCategory === "other" && (
                <input
                  type="text"
                  placeholder="Məsələn: Mansard, Dupleks, Anbar..."
                  value={otherCategory}
                  onChange={(e) => setOtherCategory(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/40 text-xs text-navy dark:text-slate-100 outline-none placeholder:text-navy/40"
                />
              )}
            </div>
          </div>

          {/* 2-ci Sıra: Tam Dinamik Ərazi İyerarxiyası (Şəhər / Region -> Rayon -> Qəsəbə / Ərazi) */}
          <div className="pt-3 border-t border-navy/5 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-copper uppercase tracking-wider block">
              📍 Dəqiq Ərazi İyerarxiyası
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Şəhər / Region */}
              <div>
                <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1.5">
                  1. Şəhər / Bölgə
                </label>
                <select
                  value={selectedRegionId}
                  onChange={(e) => {
                    setSelectedRegionId(e.target.value);
                    setSelectedDistrictId("all");
                    setSelectedSettlement("all");
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none font-semibold cursor-pointer"
                >
                  <option value="all">Bütün Azərbaycan</option>
                  {AZERBAIJAN_REGIONS.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name}
                    </option>
                  ))}
                  <option value="other">✍️ Digər Şəhər / Bölgə</option>
                </select>

                {selectedRegionId === "other" && (
                  <input
                    type="text"
                    placeholder="Şəhəri və ya bölgəni qeyd edin..."
                    value={otherCity}
                    onChange={(e) => setOtherCity(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/40 text-xs text-navy dark:text-slate-100 outline-none placeholder:text-navy/40"
                  />
                )}
              </div>

              {/* 2. Rayon */}
              <div>
                <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1.5">
                  2. Rayon
                </label>
                <select
                  value={selectedDistrictId}
                  onChange={(e) => {
                    setSelectedDistrictId(e.target.value);
                    setSelectedSettlement("all");
                  }}
                  disabled={selectedRegionId === "other"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none font-semibold cursor-pointer disabled:opacity-50"
                >
                  <option value="all">
                    {activeRegion ? `Bütün ${activeRegion.name} rayonları` : "Bütün Rayonlar"}
                  </option>
                  {activeRegion?.districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                  <option value="other">✍️ Digər Rayon</option>
                </select>

                {selectedDistrictId === "other" && (
                  <input
                    type="text"
                    placeholder="Rayon adını qeyd edin..."
                    value={otherDistrict}
                    onChange={(e) => setOtherDistrict(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/40 text-xs text-navy dark:text-slate-100 outline-none placeholder:text-navy/40"
                  />
                )}
              </div>

              {/* 3. Qəsəbə / Mikrorayon / Metro */}
              <div>
                <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1.5">
                  3. Qəsəbə / Mikrorayon / Metro
                </label>
                <select
                  value={selectedSettlement}
                  onChange={(e) => setSelectedSettlement(e.target.value)}
                  disabled={!activeDistrict}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none font-semibold cursor-pointer disabled:opacity-50"
                >
                  <option value="all">
                    {activeDistrict ? `Bütün ${activeDistrict.name} qəsəbələri` : "Əvvəlcə rayon seçin"}
                  </option>
                  {activeDistrict?.settlements?.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="other">✍️ Digər Qəsəbə / Ərazi</option>
                </select>

                {selectedSettlement === "other" && (
                  <input
                    type="text"
                    placeholder="Qəsəbə və ya massiv adını qeyd edin..."
                    value={otherSettlement}
                    onChange={(e) => setOtherSettlement(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/40 text-xs text-navy dark:text-slate-100 outline-none placeholder:text-navy/40"
                  />
                )}
              </div>
            </div>
          </div>

          {/* 3-cü Sıra: Otaq sayı, Qiymət aralığı və Torpaq sahəsi (sot) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-navy/5 dark:border-slate-800">
            {/* Otaq sayı */}
            <div>
              <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1.5">
                Otaq Sayı
              </label>
              <div className="flex gap-1.5">
                {["all", "1", "2", "3", "4+"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRooms(r)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center border transition cursor-pointer ${
                      rooms === r
                        ? "bg-navy text-white border-navy dark:bg-copper dark:border-copper"
                        : "bg-slate-50 dark:bg-slate-800 text-navy dark:text-slate-200 border-navy/10 dark:border-slate-700 hover:border-copper"
                    }`}
                  >
                    {r === "all" ? "Hər" : r}
                  </button>
                ))}
              </div>
            </div>

            {/* Qiymət aralığı */}
            <div>
              <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1.5">
                Qiymət Aralığı (AZN)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-1/2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none"
                />
                <span className="text-navy/30 dark:text-slate-500 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-1/2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            {/* Torpaq sahəsi (sot) filtri */}
            <div>
              <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1.5">
                Həyət / Torpaq Sahəsi (Sot)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  placeholder="Min sot"
                  value={minLandSot}
                  onChange={(e) => setMinLandSot(e.target.value)}
                  className="w-1/2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none"
                />
                <span className="text-navy/30 dark:text-slate-500 text-xs">-</span>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Max sot"
                  value={maxLandSot}
                  onChange={(e) => setMaxLandSot(e.target.value)}
                  className="w-1/2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Əməliyyat və Sıfırlama Paneli */}
          <div className="flex items-center justify-between pt-2 border-t border-navy/5 dark:border-slate-800">
            <span className="text-xs font-bold text-navy/80 dark:text-slate-300">
              Tapıldı: <strong className="text-copper text-sm">{filteredListings.length}</strong> aktual elan
            </span>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-navy/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-navy dark:text-slate-200 hover:border-copper hover:text-copper transition cursor-pointer"
            >
              <FiRotateCcw /> Filtrləri Sıfırla
            </button>
          </div>
        </div>

        {/* Elanlar Qriqi */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-copper border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-navy/60 dark:text-slate-400">
              Elanlar yüklənir...
            </p>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-navy/10 dark:border-slate-800 shadow-sm max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-copper/10 text-copper flex items-center justify-center mx-auto text-2xl">
              🏠
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-navy dark:text-white">
                Hazırda heç bir elan yoxdur
              </h3>
              <p className="text-xs text-navy/60 dark:text-slate-400">
                İlk real daşınmaz əmlak elanını siz yerləşdirərək bazarda alıcılara təqdim edin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/listings/add")}
              className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-navy text-white hover:bg-copper text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <span>+</span> İlk Elanı Yerləşdir
            </button>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-navy/10 dark:border-slate-800 shadow-sm max-w-md mx-auto space-y-4">
            <FiSearch className="text-4xl text-copper/60 mx-auto" />
            <h3 className="text-lg font-bold text-navy dark:text-white">
              Axtarışınıza uyğun elan tapılmadı
            </h3>
            <p className="text-xs text-navy/60 dark:text-slate-400">
              Filtrləri dəyişərək və ya sıfırlayaraq yenidən cəhd edə bilərsiniz.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-navy text-white hover:bg-copper text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <FiRotateCcw /> Bütün Filtrləri Sıfırla
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950">
          <div className="w-10 h-10 border-4 border-copper border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ListingsContent />
    </Suspense>
  );
}
