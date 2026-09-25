"use client";

import { useEffect, useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import {
  FiAward,
  FiStar,
  FiTrendingUp,
  FiPhone,
  FiMapPin,
  FiCheckCircle,
  FiShield,
  FiPercent,
  FiSearch,
  FiFilter,
  FiTag,
  FiRotateCcw,
} from "react-icons/fi";
import Link from "next/link";

const FILTER_AREAS = [
  "all",
  "Yasamal",
  "Nəsimi",
  "Nərimanov",
  "Xətai",
  "Səbail",
  "Binəqədi",
  "Sabunçu",
  "Suraxanı",
  "Abşeron",
];

const FILTER_SPECIALTIES = [
  "all",
  "Yeni Tikili",
  "Köhnə Tikili",
  "Mənzil",
  "Villa",
  "Ofis",
  "Torpaq",
];

export default function RealtorsPage() {
  const { supabase } = useApp();
  const [realtors, setRealtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("score"); // "score", "rating", "sales", "speed"
  const [areaFilter, setAreaFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");

  const [recalculating, setRecalculating] = useState(false);
  const [recalcMsg, setRecalcMsg] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    agencyName: "",
    commissionRate: "1.5%",
    legalStatus: "VÖEN: 1403928191",
    bio: "",
  });

  const loadRankings = async (sortMethod = sortBy, area = areaFilter, specialty = specialtyFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sortMethod) params.set("sortBy", sortMethod);
      if (area && area !== "all") params.set("area", area);
      if (specialty && specialty !== "all") params.set("specialty", specialty);

      const res = await fetch(`/api/realtors/rankings?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRealtors(json.data);
      } else {
        setRealtors([]);
      }
    } catch (err) {
      console.error("Rieltorlar yüklənmədi:", err);
      setRealtors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRankings(sortBy, areaFilter, specialtyFilter);
  }, [sortBy, areaFilter, specialtyFilter]);

  const handleRecalculateCron = async () => {
    setRecalculating(true);
    setRecalcMsg("");
    try {
      const res = await fetch("/api/realtors/rankings", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setRecalcMsg(json.message || "Aylıq reytinq alqoritmi uğurla icra edildi!");
        await loadRankings();
        setTimeout(() => setRecalcMsg(""), 4000);
      }
    } catch (e) {
      console.error("Cron xətası:", e);
    } finally {
      setRecalculating(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setAreaFilter("all");
    setSpecialtyFilter("all");
    setSortBy("score");
  };

  const filteredRealtors = useMemo(() => {
    let list = [...realtors];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.full_name || "").toLowerCase().includes(q) ||
          (r.agency_name || "").toLowerCase().includes(q) ||
          r.service_areas?.some((a) => a.toLowerCase().includes(q))
      );
    }

    if (areaFilter !== "all") {
      list = list.filter((r) =>
        r.service_areas?.some((a) => a.toLowerCase().includes(areaFilter.toLowerCase()))
      );
    }

    if (specialtyFilter !== "all") {
      list = list.filter((r) =>
        r.specialties?.some((s) => s.toLowerCase().includes(specialtyFilter.toLowerCase()))
      );
    }

    if (sortBy === "sales") {
      list.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
    } else if (sortBy === "speed") {
      list.sort((a, b) => (a.sales_speed_days || 99) - (b.sales_speed_days || 99));
    } else if (sortBy === "rating") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      list.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    return list.slice(0, 50);
  }, [realtors, search, areaFilter, specialtyFilter, sortBy]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-navy dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Başlıq və İdarəetmə */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-navy/10 dark:border-slate-800 pb-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-copper/10 text-copper uppercase tracking-wider inline-flex items-center gap-1.5 border border-copper/20">
              <FiAward /> Aylıq Avtomatik Reytinq & Alqoritmik Sıralama
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-navy dark:text-white">
              Peşəkar Rieltorlar və Agentliklər
            </h1>
            <p className="text-navy/70 dark:text-slate-400 text-xs sm:text-sm">
              Satış sayı, satış sürəti, aktiv portfel və müştəri ulduzlarına əsaslanan avtomatik aylıq reytinq.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRecalculateCron}
              disabled={recalculating}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-navy dark:text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
              title="recompute_realtor_rankings alqoritmini dərhal icra edib xalları yeniləyir"
            >
              {recalculating ? (
                <div className="w-3.5 h-3.5 border-2 border-navy dark:border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>⚡</span>
              )}
              Aylıq Reytinqi Yenidən Hesabla (Cron)
            </button>
          </div>
        </div>

        {recalcMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <FiCheckCircle className="text-base shrink-0" /> {recalcMsg}
          </div>
        )}

        {/* Xüsusi Filter Sistemi (Əraziyə, Xüsusiyyətlərə və Sıralamaya görə) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-navy/10 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Axtarış Input */}
            <div className="relative flex-1">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-copper text-sm" />
              <input
                type="text"
                placeholder="Rieltor adı, agentlik və ya fəaliyyət ərazisi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none focus:border-copper transition"
              />
            </div>

            {/* Sıralama */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSortBy("score")}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  sortBy === "score"
                    ? "bg-white dark:bg-slate-900 text-copper shadow-sm"
                    : "text-navy/70 dark:text-slate-400 hover:text-navy dark:hover:text-white"
                }`}
              >
                Ümumi Xal
              </button>
              <button
                type="button"
                onClick={() => setSortBy("rating")}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  sortBy === "rating"
                    ? "bg-white dark:bg-slate-900 text-copper shadow-sm"
                    : "text-navy/70 dark:text-slate-400 hover:text-navy dark:hover:text-white"
                }`}
              >
                Müştəri Ulduzları
              </button>
              <button
                type="button"
                onClick={() => setSortBy("sales")}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  sortBy === "sales"
                    ? "bg-white dark:bg-slate-900 text-copper shadow-sm"
                    : "text-navy/70 dark:text-slate-400 hover:text-navy dark:hover:text-white"
                }`}
              >
                Satış Sayı
              </button>
              <button
                type="button"
                onClick={() => setSortBy("speed")}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  sortBy === "speed"
                    ? "bg-white dark:bg-slate-900 text-copper shadow-sm"
                    : "text-navy/70 dark:text-slate-400 hover:text-navy dark:hover:text-white"
                }`}
              >
                Satış Sürəti
              </button>
            </div>
          </div>

          {/* Fəaliyyət Ərazisi Filtrləri (Service Areas) */}
          <div className="pt-3 border-t border-navy/10 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs font-bold text-navy/70 dark:text-slate-300 flex items-center gap-1 shrink-0">
              <FiMapPin className="text-copper" /> Fəaliyyət Ərazisi:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FILTER_AREAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAreaFilter(a)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                    areaFilter === a
                      ? "bg-copper text-white border-copper shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 text-navy/70 dark:text-slate-300 border-navy/10 dark:border-slate-700 hover:border-copper"
                  }`}
                >
                  {a === "all" ? "Bütün Ərazilər" : a}
                </button>
              ))}
            </div>
          </div>

          {/* İxtisaslaşma Filtrləri (Specialties) */}
          <div className="pt-2 border-t border-navy/10 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs font-bold text-navy/70 dark:text-slate-300 flex items-center gap-1 shrink-0">
              <FiTag className="text-copper" /> Xüsusiyyət / Növ:
            </span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {FILTER_SPECIALTIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpecialtyFilter(s)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                    specialtyFilter === s
                      ? "bg-navy text-white border-navy dark:bg-amber-600 dark:border-amber-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 text-navy/70 dark:text-slate-300 border-navy/10 dark:border-slate-700 hover:border-copper"
                  }`}
                >
                  {s === "all" ? "Bütün Növlər" : s}
                </button>
              ))}
            </div>

            {(search || areaFilter !== "all" || specialtyFilter !== "all" || sortBy !== "score") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-copper hover:underline font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <FiRotateCcw className="text-xs" /> Filtrləri Sıfırla
              </button>
            )}
          </div>
        </div>

        {/* Rieltorlar Siyahısı */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-copper border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-navy/60 dark:text-slate-400">
              Rieltorlar reytinqi Supabase bazasından oxunur...
            </p>
          </div>
        ) : filteredRealtors.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-navy/10 dark:border-slate-800 space-y-3">
            <p className="text-sm text-navy/60 dark:text-slate-400 font-medium">
              Seçilmiş filterlərə uyğun rieltor tapılmadı.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-copper underline cursor-pointer"
            >
              Bütün filtrləri sıfırla
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRealtors.map((realtor, index) => {
              const rank = realtor.monthly_rank || index + 1;
              const isTop3 = rank <= 3;
              const award = realtor.award || (
                rank === 1 ? { badge: "🥇 Qızıl Tac", title: "Ayın Çempionu" } :
                rank === 2 ? { badge: "🥈 Gümüş Ulduz", title: "Gümüş Tac" } :
                rank === 3 ? { badge: "🥉 Bürünc Ulduz", title: "Bürünc Tac" } : null
              );

              const serviceAreas = Array.isArray(realtor.service_areas) && realtor.service_areas.length > 0
                ? realtor.service_areas
                : ["Yasamal", "Nəsimi"];

              const specialties = Array.isArray(realtor.specialties) && realtor.specialties.length > 0
                ? realtor.specialties
                : ["Yeni Tikili", "Mənzil"];

              return (
                <div
                  key={realtor.id}
                  className={`bg-white dark:bg-slate-900 rounded-3xl shadow-card border p-6 flex flex-col justify-between relative overflow-hidden transition hover:shadow-lg group ${
                    rank === 1
                      ? "border-amber-400 ring-2 ring-amber-400/20"
                      : rank === 2
                      ? "border-slate-300 ring-1 ring-slate-300/30"
                      : rank === 3
                      ? "border-amber-600/60 ring-1 ring-amber-600/20"
                      : "border-navy/10 dark:border-slate-800"
                  }`}
                >
                  <div>
                    {/* Reytinq Nişanı */}
                    <div className="flex items-center justify-between mb-4">
                      {isTop3 && award ? (
                        <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full text-white shadow-sm flex items-center gap-1 ${
                          rank === 1
                            ? "bg-gradient-to-r from-amber-500 to-yellow-600"
                            : rank === 2
                            ? "bg-gradient-to-r from-slate-500 to-slate-700"
                            : "bg-gradient-to-r from-amber-700 to-amber-900"
                        }`}>
                          {award.badge} • #{rank}
                        </span>
                      ) : (
                        <span className="bg-navy/5 dark:bg-slate-800 text-navy/80 dark:text-slate-300 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-navy/10">
                          <FiAward className="text-copper" /> #{rank} Lisenziyalı Rieltor
                        </span>
                      )}

                      {realtor.score !== undefined && (
                        <span className="text-[11px] font-mono font-bold text-copper bg-copper/10 px-2 py-0.5 rounded-lg">
                          {realtor.score} bal
                        </span>
                      )}
                    </div>

                    {/* Profil Başlığı */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-navy/10 dark:bg-slate-800 flex items-center justify-center text-navy dark:text-white font-bold text-lg overflow-hidden border border-navy/10 dark:border-slate-700 shrink-0 relative">
                        {realtor.avatar_url ? (
                          <img
                            src={realtor.avatar_url}
                            alt={realtor.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{realtor.full_name?.[0] || "R"}</span>
                        )}
                        {rank === 1 && (
                          <span className="absolute -top-1 -right-1 text-sm">👑</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/realtors/${realtor.id}`}
                          className="font-bold text-base text-navy dark:text-white group-hover:text-copper transition flex items-center gap-1.5 truncate"
                        >
                          <span className="truncate">{realtor.full_name || "Peşəkar Rieltor"}</span>
                          <FiCheckCircle
                            className="text-emerald-500 text-sm shrink-0"
                            title="Təsdiqlənmiş Rieltor"
                          />
                        </Link>
                        <p className="text-xs text-navy/60 dark:text-slate-400 truncate mt-0.5">
                          {realtor.agency_name || "MÜLKERA Agentliyi"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500">
                            <FiStar className="fill-amber-500 text-xs" /> {realtor.rating || 5.0}
                          </span>
                          <span className="text-[10px] text-navy/40 dark:text-slate-500">
                            ({realtor.reviews_count || 0} rəy)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Fəaliyyət Əraziləri Göstəricisi */}
                    <div className="mb-3 space-y-1.5">
                      <span className="text-[10px] font-bold text-navy/60 dark:text-slate-400 flex items-center gap-1">
                        <FiMapPin className="text-copper" /> Fəaliyyət Ərazisi:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {serviceAreas.slice(0, 3).map((area) => (
                          <span
                            key={area}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-navy/80 dark:text-slate-300"
                          >
                            {area}
                          </span>
                        ))}
                        {serviceAreas.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] text-navy/50">
                            +{serviceAreas.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* İxtisaslaşma Göstəricisi */}
                    <div className="mb-4 space-y-1.5">
                      <span className="text-[10px] font-bold text-navy/60 dark:text-slate-400 flex items-center gap-1">
                        <FiTag className="text-copper" /> İxtisaslaşma:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {specialties.slice(0, 3).map((spec) => (
                          <span
                            key={spec}
                            className="px-2 py-0.5 rounded-lg bg-copper/10 text-[10px] font-bold text-copper"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Statistika Qutusu */}
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-navy/5 dark:border-slate-800 mb-5 text-xs">
                      <div className="flex justify-between items-center text-navy/80 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <FiTrendingUp className="text-copper" /> Aylıq Satış:
                        </span>
                        <span className="font-bold text-navy dark:text-white">
                          {realtor.sales_count || 0} əmlak
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-navy/80 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          ⚡ Satış Sürəti:
                        </span>
                        <span className="font-bold text-navy dark:text-white">
                          orta {realtor.sales_speed_days || 14} gün
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-navy/80 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <FiPercent className="text-copper" /> Xidmət haqqı:
                        </span>
                        <span className="font-bold text-copper">
                          {realtor.commission_rate || "1.5%"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fəaliyyət Düymələri */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-navy/10 dark:border-slate-800">
                    <Link
                      href={`/realtors/${realtor.id}`}
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-navy dark:text-slate-100 text-xs font-bold text-center transition"
                    >
                      Profilə bax
                    </Link>
                    <Link
                      href={`/messages?user_id=${realtor.id}`}
                      className="w-full py-2.5 rounded-xl bg-navy hover:bg-copper text-white text-xs font-bold text-center transition shadow-xs"
                    >
                      Mesaj yaz
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
