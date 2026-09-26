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
} from "react-icons/fi";
import Link from "next/link";

export default function RealtorsPage() {
  const { supabase } = useApp();
  const [realtors, setRealtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [commissionFilter, setCommissionFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score"); // "score", "rating", "sales", "speed"
  const [recalculating, setRecalculating] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    agencyName: "",
    commissionRate: "1.5%",
    legalStatus: "VÖEN: 1403928191",
    bio: ""
  });

  const loadRankings = async (sortMethod = sortBy) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/realtors/rankings?sortBy=${sortMethod}`, { cache: "no-store" });
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
    loadRankings(sortBy);
  }, [sortBy]);

  const handleRecalculateCron = async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/realtors/rankings", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setRealtors(json.data);
      }
    } catch (e) {
      console.error("Cron xətası:", e);
    } finally {
      setRecalculating(false);
    }
  };

  const handleRegisterRealtor = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/realtors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) {
        setRegisterSuccess(true);
        setTimeout(() => {
          setShowRegisterModal(false);
          setRegisterSuccess(false);
          loadRankings();
        }, 1500);
      } else {
        alert(json.error || "Qeydiyyat alınmadı");
      }
    } catch (err) {
      alert("Xəta baş verdi");
    }
  };

  const AZ_CITIES = [
    "Bütün Şəhər və Rayonlar",
    "Bakı",
    "Sumqayıt",
    "Xırdalan",
    "Gəncə",
    "Naxçıvan",
    "Mingəçevir",
    "Lənkəran",
    "Şəki",
    "Yevlax",
    "Quba",
    "Qusar",
    "Şamaxı",
    "Qəbələ",
    "Göyçay",
    "Bərdə",
    "Salyan",
    "Şəmkir"
  ];

  const filteredRealtors = useMemo(() => {
    let list = [...realtors];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.full_name || "").toLowerCase().includes(q) ||
          (r.agency_name || "").toLowerCase().includes(q) ||
          (r.bio || "").toLowerCase().includes(q)
      );
    }

    if (regionFilter !== "all") {
      const reg = regionFilter.toLowerCase();
      list = list.filter(
        (r) =>
          (r.agency_name || "").toLowerCase().includes(reg) ||
          (r.bio || "").toLowerCase().includes(reg) ||
          (r.full_name || "").toLowerCase().includes(reg)
      );
    }

    if (commissionFilter !== "all") {
      list = list.filter((r) => {
        const comm = (r.commission_rate || "").toString();
        return comm.includes(commissionFilter);
      });
    }

    if (sortBy === "sales") {
      list.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
    } else if (sortBy === "speed") {
      list.sort((a, b) => (a.sales_speed_days || 99) - (b.sales_speed_days || 99));
    } else {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return list.slice(0, 50); // Top 50
  }, [realtors, search, sortBy]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-navy dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Başlıq və Məlumat */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-navy/10 dark:border-slate-800 pb-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-copper/10 text-copper uppercase tracking-wider inline-flex items-center gap-1.5">
              <FiAward /> Aylıq Avtomatik Reytinq & Sertifikatlaşdırma
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-navy dark:text-white">
              Peşəkar Rieltorlar və Agentliklər
            </h1>
            <p className="text-navy/70 dark:text-slate-400 text-xs sm:text-sm">
              Tamamlanmış satışlar, aktiv elan sayı və müştəri rəylərinə əsasən avtomatik xal alqoritmi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRecalculateCron}
              disabled={recalculating}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-navy dark:text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
              title="Aylıq alqoritmi dərhal yenidən icra edib xalları və 1, 2, 3-cü yerləri müəyyən edir"
            >
              {recalculating ? (
                <div className="w-3.5 h-3.5 border-2 border-navy dark:border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>⚡</span>
              )}
              Aylıq Reytinqi Hesabla (Cron)
            </button>

            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-copper to-amber-600 hover:from-copper-dark hover:to-amber-700 text-white text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span> Rieltor Kimi Qeydiyyat
            </button>
          </div>
        </div>

        {/* Axtarış və Sıralama Filtri */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-navy/10 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto flex-1">
            <div className="relative w-full">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-copper" />
              <input
                type="text"
                placeholder="Rieltor və ya agentlik adı..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none focus:border-copper transition"
              />
            </div>

            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none focus:border-copper transition"
            >
              {AZ_CITIES.map((city, idx) => (
                <option key={idx} value={idx === 0 ? "all" : city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              value={commissionFilter}
              onChange={(e) => setCommissionFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none focus:border-copper transition"
            >
              <option value="all">Bütün Komissiyalar</option>
              <option value="1%">1% Komissiya</option>
              <option value="1.5%">1.5% Komissiya</option>
              <option value="2%">2% Komissiya</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <span className="text-xs font-semibold text-navy/60 dark:text-slate-400 whitespace-nowrap">
              Sırala:
            </span>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSortBy("score")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  sortBy === "rating"
                    ? "bg-white dark:bg-slate-900 text-copper shadow-sm"
                    : "text-navy/70 dark:text-slate-400 hover:text-navy dark:hover:text-white"
                }`}
              >
                Reytinqə görə
              </button>
              <button
                type="button"
                onClick={() => setSortBy("sales")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  sortBy === "sales"
                    ? "bg-white dark:bg-slate-900 text-copper shadow-sm"
                    : "text-navy/70 dark:text-slate-400 hover:text-navy dark:hover:text-white"
                }`}
              >
                Satış sayına görə
              </button>
              <button
                type="button"
                onClick={() => setSortBy("speed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  sortBy === "speed"
                    ? "bg-white dark:bg-slate-900 text-copper shadow-sm"
                    : "text-navy/70 dark:text-slate-400 hover:text-navy dark:hover:text-white"
                }`}
              >
                Satış sürətinə görə
              </button>
            </div>
          </div>
        </div>

        {/* Rieltorlar Siyahısı */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-copper border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-navy/60 dark:text-slate-400">
              Rieltorlar reytinqi yüklənir...
            </p>
          </div>
        ) : filteredRealtors.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-navy/10 dark:border-slate-800">
            <p className="text-sm text-navy/60 dark:text-slate-400 font-medium">
              Axtarışa uyğun rieltor tapılmadı.
            </p>
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

              return (
                <div
                  key={realtor.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl shadow-card border p-6 flex flex-col justify-between relative overflow-hidden transition hover:shadow-lg group ${
                    rank === 1
                      ? "border-amber-400 ring-2 ring-amber-400/20"
                      : rank === 2
                      ? "border-slate-300 ring-1 ring-slate-300/30"
                      : rank === 3
                      ? "border-amber-600/60 ring-1 ring-amber-600/20"
                      : "border-navy/10 dark:border-slate-800"
                  }`}
                >
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
                        <FiAward className="text-copper" /> #{rank} Top Rieltor
                      </span>
                    )}

                    {(realtor.monthly_score || realtor.score) && (
                      <span className="text-[11px] font-mono font-bold text-copper bg-copper/10 px-2 py-0.5 rounded-lg">
                        {realtor.monthly_score || realtor.score} bal
                      </span>
                    )}
                  </div>

                  <div>
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
                            <FiStar className="fill-amber-500 text-xs" /> {realtor.rating || 4.9}
                          </span>
                          <span className="text-[10px] text-navy/40 dark:text-slate-500">
                            ({realtor.reviews_count || 12} rəy)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rieltor Detalları: Komissiya və Qanuni Status */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-navy/5 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-navy/50 dark:text-slate-400 block flex items-center gap-1">
                          <FiPercent className="text-copper" /> Xidmət haqqı:
                        </span>
                        <span className="text-xs font-extrabold text-copper">
                          {realtor.commission_rate || "1-2%"}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-navy/5 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-navy/50 dark:text-slate-400 block flex items-center gap-1">
                          <FiShield className="text-emerald-500" /> Hüquqi status:
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {realtor.legal_status || "VÖEN təsdiqli"}
                        </span>
                      </div>
                    </div>

                    {/* Statistika Qutusu */}
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-navy/5 dark:border-slate-800 mb-5 text-xs">
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
                          <FiStar className="text-amber-500" /> Müştəri Razılığı:
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {realtor.satisfaction_rate || "99%"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-navy/80 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          ⚡ Satış Sürəti:
                        </span>
                        <span className="font-bold text-navy dark:text-white">
                          orta {realtor.sales_speed_days || 10} gün
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Əlaqə və Profilə Keçid Düymələri */}
                  <div className="space-y-2 pt-2 border-t border-navy/5 dark:border-slate-800">
                    {realtor.phone && (
                      <a
                        href={`tel:${realtor.phone}`}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-navy text-white hover:bg-copper py-2.5 px-4 text-xs font-semibold transition shadow-sm"
                      >
                        <FiPhone /> {realtor.phone}
                      </a>
                    )}
                    <Link
                      href={`/realtors/${realtor.id}`}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-navy dark:text-slate-200 py-2.5 px-4 text-xs font-semibold transition text-center"
                    >
                      Profilə və Bütün Elanlarına Bax
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rieltor Qeydiyyat Modalı */}
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-navy/10 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-navy/10 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  <h3 className="font-bold text-base text-navy dark:text-white">
                    Rieltor Kimi Qeydiyyatdan Keç
                  </h3>
                </div>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="text-navy/50 hover:text-navy dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {registerSuccess ? (
                <div className="p-6 text-center space-y-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-700 dark:text-emerald-300">
                  <div className="text-3xl">🎉</div>
                  <h4 className="font-bold text-sm">Rieltor profiliniz uğurla yaradıldı!</h4>
                  <p className="text-xs">Reytinq cədvəlinə əlavə olundunuz.</p>
                </div>
              ) : (
                <form onSubmit={handleRegisterRealtor} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-navy/70 dark:text-slate-300 mb-1">
                      Ad və Soyad *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Məs: Tural Quliyev"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-navy/70 dark:text-slate-300 mb-1">
                      Email ünvanı *
                    </label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="tural.realtor@mulkera.az"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-navy/70 dark:text-slate-300 mb-1">
                        Əlaqə Telefonu
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+994 50 123 45 67"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-navy/70 dark:text-slate-300 mb-1">
                        Komissiya Faizi
                      </label>
                      <input
                        type="text"
                        value={formData.commissionRate}
                        onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                        placeholder="1.5%"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-navy/70 dark:text-slate-300 mb-1">
                      Agentlik / Şirkət Adı
                    </label>
                    <input
                      type="text"
                      value={formData.agencyName}
                      onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                      placeholder="Məs: Zirvə Əmlak MMC"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-navy/70 dark:text-slate-300 mb-1">
                      Hüquqi Status (VÖEN)
                    </label>
                    <input
                      type="text"
                      value={formData.legalStatus}
                      onChange={(e) => setFormData({ ...formData, legalStatus: e.target.value })}
                      placeholder="VÖEN: 1403928191"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRegisterModal(false)}
                      className="px-4 py-2 rounded-xl border border-navy/15 dark:border-slate-700 text-xs font-semibold text-navy dark:text-slate-300 cursor-pointer"
                    >
                      Ləğv et
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-copper text-white text-xs font-bold hover:bg-copper-dark transition shadow-sm cursor-pointer"
                    >
                      Rieltor Kimi Qeydiyyatı Tamamla
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
