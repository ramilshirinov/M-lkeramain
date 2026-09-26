"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { localizedField } from "@/lib/listings";
import { PROPERTY_CATEGORIES } from "@/constants/categories";
import dynamic from "next/dynamic";
import Link from "next/link";
import { 
  FiFilter, 
  FiX, 
  FiMapPin, 
  FiHome, 
  FiEye, 
  FiDollarSign, 
  FiCrosshair, 
  FiList,
  FiRotateCcw
} from "react-icons/fi";

// Leaflet xəritəsini SSR xətası verməməsi üçün dinamik import edirik
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((mod) => mod.Circle), { ssr: false });
const MarkerClusterGroup = dynamic(() => import("react-leaflet-cluster"), { ssr: false });

const BAKU_CENTER = [40.4093, 49.8671];
const DAILY_VALUES = ["daily", "daily_rent", "short_term_rent"];
const PLACEHOLDER = "/images/placeholder-property.svg";

const TX_FILTERS = [
  { id: "all", label: "Hamısı", match: () => true },
  { id: "sale", label: "Satış", match: (t) => t === "sale" },
  { id: "rent", label: "Kirayə", match: (t) => t === "rent" },
  { id: "daily", label: "Günlük Kirayə", match: (t) => DAILY_VALUES.includes(t) },
];

const CURRENCY_SYMBOL = { AZN: "₼", USD: "$", EUR: "€" };

function toCoord(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function shortPrice(value, currency) {
  const n = Number(value);
  const symbol = CURRENCY_SYMBOL[currency || "AZN"] || currency || "₼";
  if (!Number.isFinite(n) || n <= 0) return `— ${symbol}`;
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M ${symbol}`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K ${symbol}`;
  return `${n} ${symbol}`;
}

// İki koordinat arasındakı məsafəni km ilə hesablayan funksiya
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Xəritə üzərində "flyTo" əməliyyatını idarə edən komponent
function MapFlyController({ target }) {
  const [MapHook, setMapHook] = useState(null);

  useEffect(() => {
    import("react-leaflet").then((mod) => setMapHook(() => mod.useMap));
  }, []);

  if (!MapHook) return null;
  return <FlyToHandler useMap={MapHook} target={target} />;
}

function FlyToHandler({ useMap, target }) {
  const map = useMap();

  useEffect(() => {
    if (target && map) {
      map.flyTo([target.lat, target.lng], 15, { duration: 1.2 });
    }
  }, [target, map]);

  return null;
}

// Boz səhifə və boş xəritə xətasını aradan qaldıran avtomatik ölçü tənzimləyici
function MapResizeController({ panelOpen, showListPanel }) {
  const [MapHook, setMapHook] = useState(null);

  useEffect(() => {
    import("react-leaflet").then((mod) => setMapHook(() => mod.useMap));
  }, []);

  if (!MapHook) return null;
  return <ResizeHandler useMap={MapHook} deps={[panelOpen, showListPanel]} />;
}

function ResizeHandler({ useMap, deps }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 150);

    const onResize = () => {
      try {
        map.invalidateSize();
      } catch (e) {}
    };

    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [map, ...deps]);

  return null;
}

export default function MapPage() {
  const { supabase, locale, language } = useApp();
  const currentLocale = locale || language || "az";
  const router = useRouter();

  const [listings, setListings] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leafletModules, setLeafletModules] = useState(null);

  // Filtrlər
  const [txFilter, setTxFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [roomsFilter, setRoomsFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [mapType, setMapType] = useState("standard"); // "standard" | "satellite" | "dark"

  // Panel və Interaksiya
  const [panelOpen, setPanelOpen] = useState(false);
  const [showListPanel, setShowListPanel] = useState(true);
  const [flyTarget, setFlyTarget] = useState(null);

  // Ətrafımı tap
  const [userPosition, setUserPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);

  // Leaflet modulunu və ikonları yükləyirik
  useEffect(() => {
    import("leaflet").then((L) => {
      setLeafletModules(L);
    });
  }, []);

  // Kateqoriyaların yüklənməsi
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("categories")
      .select("*")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAllCategories(data);
        } else {
          setAllCategories(PROPERTY_CATEGORIES);
        }
      })
      .catch(() => {
        setAllCategories(PROPERTY_CATEGORIES);
      });
  }, [supabase]);

  // Elanların birbaşa API və Supabase üzərindən stabil yüklənməsi
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        // Əvvəlcə /api/listings vasitəsilə tam məlumatı alırıq
        const res = await fetch("/api/listings", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setListings(json.data);
          setError("");
          setLoading(false);
          return;
        }

        // Birbaşa Supabase query fallback
        if (supabase && typeof supabase.from === "function") {
          const { data, error: err } = await supabase
            .from("listings")
            .select("*, listing_photos(url)");

          if (!cancelled) {
            if (!err && data) {
              setListings(data);
              setError("");
            } else if (err) {
              console.error("Xəritə elanları yüklənmədi:", err.message);
            }
          }
        }
      } catch (err) {
        console.error("Elanlar yüklənərkən xəta:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Bütün elanların koordinat ilə xəritəyə yerləşdirilməsi
  const mapped = useMemo(
    () =>
      listings.map((l, index) => {
        let lat = toCoord(l.latitude ?? l.lat);
        let lng = toCoord(l.longitude ?? l.lng ?? l.lon);

        // Əgər koordinat qeyd olunmayıbsa, Bakı mərkəzindən səliqəli yerləşdirilir
        if (lat === null || lng === null) {
          const seed = (typeof l.id === "number" ? l.id : index + 1) * 0.017;
          lat = BAKU_CENTER[0] + Math.sin(seed) * 0.035;
          lng = BAKU_CENTER[1] + Math.cos(seed) * 0.045;
        }

        return {
          ...l,
          _lat: lat,
          _lng: lng,
        };
      }),
    [listings]
  );

  // Kateqoriya seçimləri
  const categoryOptions = useMemo(() => {
    if (allCategories && allCategories.length > 0) {
      return allCategories.map((c) => ({
        id: String(c.id),
        slug: c.slug || String(c.id),
        name: localizedField(c, "name", currentLocale) || c.name || c.name_az,
      }));
    }
    return PROPERTY_CATEGORIES.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
    }));
  }, [allCategories, currentLocale]);

  // Əlaqələndirilmiş filtrləmə məntiqi (Satış/Kirayə/Günlük, Əmlak növü, Qiymət, Otaq)
  let filtered = useMemo(() => {
    const tx = TX_FILTERS.find((f) => f.id === txFilter) || TX_FILTERS[0];
    return mapped.filter((l) => {
      // 1. Əməliyyat növü (Satış / Kirayə / Günlük)
      if (!tx.match(l.transaction_type)) return false;

      // 2. Əmlak növü / Kateqoriya
      if (categoryFilter !== "all") {
        const matchesCategory =
          String(l.category_id) === categoryFilter ||
          l.categories?.slug === categoryFilter ||
          String(l.property_type || "").toLowerCase() === categoryFilter.toLowerCase();
        if (!matchesCategory) return false;
      }

      // 3. Qiymət aralığı
      if (minPrice && Number(l.price) < Number(minPrice)) return false;
      if (maxPrice && Number(l.price) > Number(maxPrice)) return false;

      // 4. Otaq sayı
      if (roomsFilter !== "all") {
        const rc = Number(l.room_count || l.rooms || 0);
        if (roomsFilter === "4+" ? rc < 4 : rc !== Number(roomsFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [mapped, txFilter, categoryFilter, roomsFilter, minPrice, maxPrice]);

  // Məsafəyə görə hesablama və sıralama
  if (userPosition) {
    filtered = filtered.map((item) => ({
      ...item,
      _distanceKm: getDistanceKm(userPosition.lat, userPosition.lng, item._lat, item._lng),
    }));

    if (sortByDistance) {
      filtered = [...filtered].sort((a, b) => (a._distanceKm || 0) - (b._distanceKm || 0));
    }
  }

  const handleFindMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Brauzeriniz mövqe müəyyənləşdirməni dəstəkləmir.");
      setTimeout(() => setError(""), 4000);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPosition(coords);
        setFlyTarget(coords);
        setSortByDistance(true);
        setLocating(false);
      },
      () => {
        setError("Mövqeyinizi müəyyənləşdirmək mümkün olmadı. Brauzer icazələrini yoxlayın.");
        setTimeout(() => setError(""), 4000);
        setLocating(false);
      }
    );
  };

  const handleResetFilters = () => {
    setTxFilter("all");
    setCategoryFilter("all");
    setRoomsFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setSortByDistance(false);
  };

  const chipBase = "px-3.5 py-1.5 rounded-full text-xs font-semibold transition border whitespace-nowrap cursor-pointer";
  const chipOn = "bg-navy text-white border-navy dark:bg-copper dark:border-copper shadow-sm";
  const chipOff =
    "bg-white dark:bg-slate-800 text-navy dark:text-slate-200 border-navy/15 dark:border-slate-700 hover:border-copper hover:text-copper";

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] w-full relative isolate overflow-hidden bg-slate-100 dark:bg-slate-950">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Üst Filter / İdarəetmə Paneli */}
      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xl flex items-center gap-2">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="ml-2 hover:opacity-80 text-xs">✕</button>
        </div>
      )}
      <div className="bg-white dark:bg-slate-900 border-b border-navy/10 dark:border-slate-800 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 z-30 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base sm:text-lg font-bold font-heading text-navy dark:text-slate-100 flex items-center gap-2">
            <FiMapPin className="text-copper" /> Xəritə Üzrə Axtarış
          </h1>
          <button
            type="button"
            onClick={() => setPanelOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              panelOpen
                ? "bg-copper text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-navy dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <FiFilter /> {panelOpen ? "Filtrləri Bağla" : "Filtrlər"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Xəritə növü */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-navy/10 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setMapType("standard")}
              className={`px-2.5 py-1 font-bold rounded-lg transition cursor-pointer ${
                mapType === "standard"
                  ? "bg-white dark:bg-slate-900 text-navy dark:text-white shadow-sm"
                  : "text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-white"
              }`}
            >
              🗺️ Standart
            </button>
            <button
              type="button"
              onClick={() => setMapType("satellite")}
              className={`px-2.5 py-1 font-bold rounded-lg transition cursor-pointer ${
                mapType === "satellite"
                  ? "bg-white text-navy shadow-sm"
                  : "text-navy/60 hover:text-navy"
              }`}
            >
              🛰️ Peyk
            </button>
          </div>

          {/* Qiymət aralığı */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
            <FiDollarSign className="text-navy/40 dark:text-slate-400 text-sm shrink-0" />
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min AZN"
              className="w-20 bg-transparent text-xs outline-none text-navy dark:text-slate-200"
            />
            <span className="text-navy/30 dark:text-slate-500 text-xs">-</span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max AZN"
              className="w-20 bg-transparent text-xs outline-none text-navy dark:text-slate-200"
            />
          </div>

          <button
            type="button"
            onClick={handleFindMyLocation}
            disabled={locating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-navy dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0 cursor-pointer"
          >
            <FiCrosshair /> {locating ? "Axtarılır..." : "Ətrafımı Tap"}
          </button>

          <button
            type="button"
            onClick={() => setShowListPanel((prev) => !prev)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
              showListPanel ? "bg-navy text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-navy dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <FiList /> Siyahı ({filtered.length})
          </button>
        </div>
      </div>

      {/* Əsas Sahə */}
      <div className="flex-1 w-full relative z-0 flex overflow-hidden">
        
        {/* Yan Filtrləmə Paneli (Mobil üçün Overlay Drawer, Masaüstü üçün Flex Sütun) */}
        {panelOpen && (
          <div className="fixed inset-0 top-[60px] md:relative md:top-auto z-40 md:z-20 flex">
            {/* Mobil arxa plan örtüyü */}
            <div
              className="fixed inset-0 bg-black/40 md:hidden"
              onClick={() => setPanelOpen(false)}
            />
            <div className="relative w-80 sm:w-84 max-w-[85vw] h-full shrink-0 border-r border-navy/10 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto space-y-4 p-5 shadow-2xl md:shadow-lg z-50">
              <div className="flex items-center justify-between border-b border-navy/10 dark:border-slate-800 pb-3">
                <span className="flex items-center gap-2 text-sm font-bold text-navy dark:text-slate-100 font-heading">
                  <FiFilter className="text-copper" /> Filtrlər və Axtarış
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    title="Filtrləri sıfırla"
                    className="text-xs text-navy/50 dark:text-slate-400 hover:text-copper flex items-center gap-1 cursor-pointer"
                  >
                    <FiRotateCcw className="text-xs" /> Sıfırla
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    aria-label="Bağla"
                    className="rounded-full p-1 text-navy/60 dark:text-slate-400 hover:text-copper cursor-pointer"
                  >
                    <FiX />
                  </button>
                </div>
              </div>

              {/* 1. Əməliyyat növü (Satış / Kirayə / Günlük) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy/80 dark:text-slate-300 block">
                  Əməliyyat Növü
                </label>
                <div className="flex flex-wrap gap-2">
                  {TX_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTxFilter(f.id)}
                      className={`${chipBase} ${txFilter === f.id ? chipOn : chipOff}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Əmlak növü (Property Type) */}
              <div className="space-y-1.5 border-t border-navy/10 dark:border-slate-800 pt-3">
                <label className="text-xs font-bold text-navy/80 dark:text-slate-300 block">
                  Əmlak Növü
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("all")}
                    className={`${chipBase} ${categoryFilter === "all" ? chipOn : chipOff}`}
                  >
                    Bütün növlər
                  </button>
                  {categoryOptions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryFilter(c.id)}
                      className={`${chipBase} ${categoryFilter === c.id ? chipOn : chipOff}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Otaq sayı */}
              <div className="space-y-1.5 border-t border-navy/10 dark:border-slate-800 pt-3">
                <label className="text-xs font-bold text-navy/80 dark:text-slate-300 block">
                  Otaq Sayı
                </label>
                <div className="flex gap-1.5">
                  {["all", "1", "2", "3", "4+"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRoomsFilter(r)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold text-center transition border ${
                        roomsFilter === r ? chipOn : chipOff
                      }`}
                    >
                      {r === "all" ? "Hər" : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Qiymət filtri */}
              <div className="space-y-1.5 border-t border-navy/10 dark:border-slate-800 pt-3">
                <label className="text-xs font-bold text-navy/80 dark:text-slate-300 block">
                  Qiymət Aralığı (AZN)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-1/2 p-2.5 rounded-xl border border-navy/15 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-navy dark:text-slate-100 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-1/2 p-2.5 rounded-xl border border-navy/15 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-navy dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-navy/10 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-navy dark:text-slate-200">
                  Xəritədə: <strong className="text-copper">{filtered.length}</strong> elan
                </span>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="px-4 py-2 rounded-xl bg-navy dark:bg-copper text-white text-xs font-bold md:hidden"
                >
                  Tətbiq et
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Split View Siyahısı (Sol Tərəf) */}
        {showListPanel && (
          <div className="hidden md:flex flex-col w-80 lg:w-84 shrink-0 border-r border-navy/10 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto z-10">
            {sortByDistance && (
              <div className="px-4 py-2 text-[11px] text-copper font-semibold bg-copper/5 border-b border-navy/10 dark:border-slate-800">
                Məsafəyə görə sıralanıb
              </div>
            )}
            {loading ? (
              <p className="text-sm text-navy/60 dark:text-slate-400 p-4 text-center">Elanlar yüklənir...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center p-6 space-y-2">
                <p className="text-sm text-navy/60 dark:text-slate-400">Filtrə uyğun elan tapılmadı.</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-copper underline cursor-pointer"
                >
                  Filtrləri sıfırla
                </button>
              </div>
            ) : (
              filtered.map((item) => {
                const photo =
                  item.listing_photos?.find((p) => p?.url)?.url ||
                  item.image_url ||
                  PLACEHOLDER;

                return (
                  <button
                    key={item.id}
                    onClick={() => setFlyTarget({ lat: item._lat, lng: item._lng })}
                    className="flex items-center gap-3 p-3 border-b border-navy/5 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left w-full cursor-pointer group"
                  >
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-navy/10 dark:border-slate-700">
                      <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-navy dark:text-slate-200 truncate group-hover:text-copper transition">
                        {localizedField(item, "title", currentLocale) || item.title || item.title_az}
                      </p>
                      <p className="text-xs text-navy dark:text-slate-100 mt-0.5 font-extrabold">
                        {Number(item.price || 0).toLocaleString()} {item.currency || "AZN"}
                      </p>
                      <p className="text-[11px] text-navy/50 dark:text-slate-400 mt-0.5">
                        {item.room_count ? `${item.room_count} otaq · ` : ""}{item.area_m2 ? `${item.area_m2} m²` : ""}
                      </p>
                      {item._distanceKm !== undefined && (
                        <p className="text-[10px] text-copper font-medium mt-0.5">
                          {item._distanceKm.toFixed(1)} km məsafədə
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Xəritə Konteyneri - Tam ekran və təmiz Leaflet renderi */}
        <div className="flex-1 h-full w-full relative z-0">
          {loading || !leafletModules ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-navy dark:text-slate-200 font-medium z-20">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-3 border-copper border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold">Xəritə və markerlər yüklənir...</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={BAKU_CENTER}
              zoom={12}
              scrollWheelZoom={true}
              style={{ width: "100%", height: "100%" }}
            >
              {mapType === "satellite" ? (
                <TileLayer
                  key="satellite"
                  attribution='Tiles &copy; Esri'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />
              ) : (
                <TileLayer
                  key="standard"
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}

              <MapFlyController target={flyTarget} />
              <MapResizeController panelOpen={panelOpen} showListPanel={showListPanel} />

              {userPosition && (
                <>
                  <Marker position={[userPosition.lat, userPosition.lng]}>
                    <Popup>Sizin cari mövqeyiniz</Popup>
                  </Marker>
                  <Circle
                    center={[userPosition.lat, userPosition.lng]}
                    radius={400}
                    pathOptions={{ color: "#B87333", fillOpacity: 0.12 }}
                  />
                </>
              )}

              <MarkerClusterGroup chunkedLoading>
                {filtered.map((item) => {
                  const photo =
                    item.listing_photos?.find((p) => p?.url)?.url ||
                    item.image_url ||
                    PLACEHOLDER;

                  const isVip = item.is_vip;
                  const bgStyle = isVip
                    ? "background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; border: 2px solid #ffffff; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.6);"
                    : item.transaction_type === "sale"
                    ? "background: #0f172a; color: #ffffff; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);"
                    : "background: #059669; color: #ffffff; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.45);";

                  const customDivIcon = leafletModules.divIcon({
                    className: "mulkera-marker",
                    html: `<div style="${bgStyle}; display: inline-flex; align-items: center; justify-content: center; height: 30px; padding: 0 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; letter-spacing: -0.02em; cursor: pointer; white-space: nowrap;">
                      ${isVip ? '<span style="margin-right: 4px;">👑</span>' : ''}${shortPrice(item.price, item.currency)}
                    </div>`,
                    iconSize: [94, 30],
                    iconAnchor: [47, 15],
                    popupAnchor: [0, -15],
                  });

                  return (
                    <Marker 
                      key={item.id} 
                      position={[item._lat, item._lng]} 
                      icon={customDivIcon}
                    >
                      <Popup>
                        <div className="w-56 p-1 text-navy dark:text-slate-100">
                          <div className="h-32 w-full rounded-xl overflow-hidden mb-2 bg-slate-100 dark:bg-slate-800">
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="font-extrabold text-base text-navy mb-0.5">
                            {Number(item.price || 0).toLocaleString()} {item.currency || "AZN"}
                            {item.transaction_type === "rent" && <span className="text-xs font-normal text-slate-500"> /ay</span>}
                            {DAILY_VALUES.includes(item.transaction_type) && <span className="text-xs font-normal text-slate-500"> /gün</span>}
                          </div>
                          <div className="font-bold text-xs text-navy mb-1 line-clamp-1">
                            {localizedField(item, "title", currentLocale) || item.title || item.title_az}
                          </div>
                          <div className="text-[11px] text-navy/70 mb-1 flex items-center gap-1">
                            <FiMapPin className="text-copper shrink-0" /> {item.address || "Bakı"}
                          </div>
                          <div className="text-[11px] text-navy/70 mb-2">
                            {item.room_count ? `${item.room_count} otaq · ` : ""}{item.area_m2 ? `${item.area_m2} m²` : ""}
                          </div>
                          {item._distanceKm !== undefined && (
                            <p className="text-[10px] text-copper font-medium mb-2">
                              {item._distanceKm.toFixed(1)} km məsafədə
                            </p>
                          )}
                          <Link
                            href={`/listings/${item.id}`}
                            className="w-full flex items-center justify-center gap-1.5 bg-navy text-white hover:bg-copper py-2 rounded-xl text-xs font-bold transition text-center shadow-xs"
                          >
                            <FiEye /> Ətraflı bax
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MarkerClusterGroup>
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
}