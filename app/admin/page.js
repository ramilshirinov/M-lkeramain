"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import Link from "next/link";
import { 
  FiShield, FiUsers, FiHome, FiCheckCircle, FiXCircle, 
  FiAward, FiFlag, FiStar, FiTrash2, FiExternalLink, FiRefreshCw, FiEyeOff, FiEye
} from "react-icons/fi";
import ApprovedRealtorsTab from "@/components/admin/ApprovedRealtorsTab";

export default function AdminPage() {
  const { user, profile, supabase, loadingAuth } = useApp();
  const [activeTab, setActiveTab] = useState("pending"); // "pending", "approved", "listings", "reports"
  const [stats, setStats] = useState({ users: 0, listings: 0, pendingCount: 0, reportsCount: 0, reviewReportsCount: 0 });
  const [pendingRealtors, setPendingRealtors] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviewReports, setReviewReports] = useState([]);
  const [reportsFilter, setReportsFilter] = useState("reviews"); // "reviews" | "listings"
  const [loading, setLoading] = useState(true);

  // Admin yoxlaması: ya metadata, ya profile, ya email
  const isAdmin = 
    user?.user_metadata?.role === "admin" || 
    profile?.role === "admin" || 
    user?.email?.toLowerCase().includes("admin");

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", { cache: "no-store" });
      const json = await res.json();

      if (json.success) {
        setPendingRealtors(json.pendingRealtors || []);
        setAllListings(json.listings || []);
        setReports(json.reports || []);
        setReviewReports(json.reviewReports || []);
        setStats({
          users: json.stats?.users || 12,
          listings: json.stats?.listings || (json.listings || []).length,
          pendingCount: (json.pendingRealtors || []).length,
          reportsCount: (json.reports || []).length,
          reviewReportsCount: (json.reviewReports || []).length,
        });
      }
    } catch (err) {
      console.error("Admin məlumatı yüklənmədi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [loadingAuth]);

  // Rieltoru təsdiq etmək
  const handleApprove = async (id) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_realtor", id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Təsdiq olunmadı");

      setPendingRealtors((prev) => prev.filter((r) => r.id !== id));
      setStats((s) => ({ ...s, pendingCount: Math.max(0, s.pendingCount - 1) }));
      alert("Rieltor uğurla təsdiqləndi!");
    } catch (err) {
      alert("Xəta baş verdi: " + err.message);
    }
  };

  // Rieltor müraciətini rədd etmək
  const handleReject = async (id) => {
    if (!confirm("Bu rieltor müraciətini rədd etmək istədiyinizə əminsiniz?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject_realtor", id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Rədd edilmədi");

      setPendingRealtors((prev) => prev.filter((r) => r.id !== id));
      setStats((s) => ({ ...s, pendingCount: Math.max(0, s.pendingCount - 1) }));
    } catch (err) {
      alert("Xəta baş verdi: " + err.message);
    }
  };

  // Elanı VIP etmək / VIP-dən çıxarmaq
  const handleToggleVip = async (listingId, currentVip) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_vip", id: listingId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "VIP statusu dəyişdirilmədi");

      const nextVip = json.is_vip;
      setAllListings((prev) =>
        prev.map((item) => (item.id === listingId ? { ...item, is_vip: nextVip } : item))
      );
    } catch (err) {
      alert("Xəta: " + err.message);
    }
  };

  // Elanı silmək
  const handleDeleteListing = async (listingId) => {
    if (!confirm("Bu elanı bazadan tamamilə silmək istədiyinizə əminsiniz?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_listing", id: listingId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Silinmədi");

      setAllListings((prev) => prev.filter((item) => item.id !== listingId));
      setStats((s) => ({ ...s, listings: Math.max(0, s.listings - 1) }));
    } catch (err) {
      alert("Silinmə xətası: " + err.message);
    }
  };

  // Rəy Şikayətləri Moderasiyası: Rəyi gizlət
  const handleHideReview = async (reviewId, reportId) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hide_review", review_id: reviewId, report_id: reportId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Xəta");

      setReviewReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, status: "resolved", realtor_reviews: { ...r.realtor_reviews, is_hidden: true } } : r
        )
      );
      alert("Rəy uğurla gizlədildi və şikayət həll olundu.");
    } catch (err) {
      alert("Xəta: " + err.message);
    }
  };

  // Rəy Şikayətləri Moderasiyası: Rəyi bazadan tam sil
  const handleDeleteReview = async (reviewId, reportId) => {
    if (!confirm("Bu uyğunsuz rəyi bazadan tamamilə silmək istədiyinizə əminsiniz?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_review", review_id: reviewId, report_id: reportId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Xəta");

      setReviewReports((prev) => prev.filter((r) => r.id !== reportId));
      setStats((s) => ({ ...s, reviewReportsCount: Math.max(0, s.reviewReportsCount - 1) }));
      alert("Rəy bazadan tamamilə silindi.");
    } catch (err) {
      alert("Xəta: " + err.message);
    }
  };

  // Rəy Şikayətini rədd et (əsassız hesab et)
  const handleDismissReviewReport = async (reportId, reviewId) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss_review_report", report_id: reportId, review_id: reviewId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Xəta");

      setReviewReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: "dismissed" } : r))
      );
      alert("Şikayət əsassız hesab edildi və rədd olundu.");
    } catch (err) {
      alert("Xəta: " + err.message);
    }
  };

  if (loadingAuth || loading) {
    return (
      <div className="py-32 text-center text-navy dark:text-slate-200 font-medium">
        <div className="w-10 h-10 border-4 border-copper border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Admin paneli yüklənir...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-navy dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Başlıq */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-extrabold font-heading text-navy dark:text-white">
              <FiShield className="text-copper" /> MÜLKERA Rəhbərlik Paneli
            </h1>
            <p className="text-xs sm:text-sm text-navy/60 dark:text-slate-400 mt-1">
              Rieltorların təsdiqi, rəy şikayətlərinin moderasiyası və platforma nəzarəti
            </p>
          </div>

          {!isAdmin && (
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl px-4 py-2 text-xs text-amber-800 dark:text-amber-300">
              ⚠️ Rəhbər (Admin) baxış rejimindəsiniz
            </div>
          )}
        </div>

        {/* Statistika Blokları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-navy/10 dark:bg-slate-800 text-navy dark:text-white text-2xl">
              <FiUsers />
            </div>
            <div>
              <p className="text-xs text-navy/60 dark:text-slate-400 font-medium">Ümumi İstifadəçilər</p>
              <h3 className="text-2xl font-extrabold text-navy dark:text-white mt-0.5">{stats.users}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-copper/10 text-copper text-2xl">
              <FiHome />
            </div>
            <div>
              <p className="text-xs text-navy/60 dark:text-slate-400 font-medium">Aktiv Elanlar</p>
              <h3 className="text-2xl font-extrabold text-navy dark:text-white mt-0.5">{stats.listings}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 text-2xl">
              <FiAward />
            </div>
            <div>
              <p className="text-xs text-navy/60 dark:text-slate-400 font-medium">Təsdiq Gözləyən Rieltorlar</p>
              <h3 className="text-2xl font-extrabold text-navy dark:text-white mt-0.5">{stats.pendingCount}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-red-500/10 text-red-500 text-2xl">
              <FiFlag />
            </div>
            <div>
              <p className="text-xs text-navy/60 dark:text-slate-400 font-medium">Rəy & Elan Şikayətləri</p>
              <h3 className="text-2xl font-extrabold text-navy dark:text-white mt-0.5">
                {stats.reportsCount + stats.reviewReportsCount}
              </h3>
            </div>
          </div>
        </div>

        {/* Tab Menyu */}
        <div className="flex border-b border-navy/10 dark:border-slate-800 gap-4 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("pending")}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "pending"
                ? "border-copper text-copper"
                : "border-transparent text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-white"
            }`}
          >
            Təsdiq Gözləyən Rieltorlar ({pendingRealtors.length})
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "approved"
                ? "border-copper text-copper"
                : "border-transparent text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-white"
            }`}
          >
            Təsdiqlənmiş Rieltorlar
          </button>
          <button
            onClick={() => setActiveTab("listings")}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "listings"
                ? "border-copper text-copper"
                : "border-transparent text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-white"
            }`}
          >
            Elanlar ({allListings.length})
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "reports"
                ? "border-copper text-copper"
                : "border-transparent text-navy/60 dark:text-slate-400 hover:text-navy dark:hover:text-white"
            }`}
          >
            Şikayətlər ({reports.length + reviewReports.length})
          </button>
        </div>

        {/* Tab Məzmunları */}
        {activeTab === "pending" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-card border border-navy/10 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-navy/10 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-navy dark:text-white">
                  Rieltor Müraciətləri
                </h3>
                <p className="text-xs text-navy/60 dark:text-slate-400 mt-0.5">
                  Platformada rieltor kimi fəaliyyət göstərmək üçün lisenziya və sənəd təsdiqi
                </p>
              </div>
            </div>

            {pendingRealtors.length === 0 ? (
              <div className="p-12 text-center text-navy/50 dark:text-slate-400 text-sm font-medium">
                Hazırda təsdiq gözləyən yeni rieltor müraciəti yoxdur.
              </div>
            ) : (
              <div className="divide-y divide-navy/10 dark:divide-slate-800">
                {pendingRealtors.map((realtor) => (
                  <div
                    key={realtor.id}
                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-navy dark:text-white">
                          {realtor.full_name}
                        </h4>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                          Gözləmədə
                        </span>
                      </div>
                      <p className="text-xs text-navy/60 dark:text-slate-400">
                        {realtor.agency_name} · {realtor.phone} · {realtor.email}
                      </p>
                      <p className="text-[11px] text-navy/40 dark:text-slate-500">
                        Hüquqi status: {realtor.legal_status || "Qeyd olunmayıb"} | Komissiya: {realtor.commission_rate || "1.5%"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(realtor.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <FiCheckCircle /> Təsdiq Et
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(realtor.id)}
                        className="px-4 py-2 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <FiXCircle /> Rədd Et
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "approved" && (
          <ApprovedRealtorsTab />
        )}

        {activeTab === "listings" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-card border border-navy/10 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-navy/10 dark:border-slate-800">
              <h3 className="font-bold text-base text-navy dark:text-white">
                Bütün Əmlak Elanları ({allListings.length})
              </h3>
            </div>

            {allListings.length === 0 ? (
              <div className="p-12 text-center text-navy/50 dark:text-slate-400 text-sm font-medium">
                Bazada hələ elan yoxdur.
              </div>
            ) : (
              <div className="divide-y divide-navy/10 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
                {allListings.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/listings/${item.id}`}
                          className="font-bold text-sm text-navy dark:text-white hover:text-copper transition truncate"
                        >
                          {item.title || item.title_az || "Əmlak Elanı"}
                        </Link>
                        {item.is_vip && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                            VIP
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-navy/60 dark:text-slate-400">
                        {Number(item.price || 0).toLocaleString()} {item.currency || "AZN"} · {item.address}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleVip(item.id, item.is_vip)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          item.is_vip
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                            : "bg-slate-100 dark:bg-slate-800 text-navy dark:text-slate-200 hover:bg-amber-500 hover:text-white"
                        }`}
                      >
                        <FiStar className={item.is_vip ? "fill-amber-500 text-amber-500" : ""} />
                        {item.is_vip ? "VIP Ləğv Et" : "VIP Et"}
                      </button>

                      <Link
                        href={`/listings/${item.id}`}
                        target="_blank"
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-navy dark:text-slate-200 text-xs font-semibold"
                        title="Elana bax"
                      >
                        <FiExternalLink />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteListing(item.id)}
                        className="p-2 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition cursor-pointer"
                        title="Elanı sil"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Şikayətlər Bölməsi: Həm Rəy Şikayətləri, Həm Elan Şikayətləri */}
        {activeTab === "reports" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-card border border-navy/10 dark:border-slate-800 overflow-hidden space-y-4">
            <div className="p-6 border-b border-navy/10 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-navy dark:text-white">
                  Şikayətlər və Moderasiya
                </h3>
                <p className="text-xs text-navy/60 dark:text-slate-400 mt-0.5">
                  Rieltor rəyləri və elanlar haqqında göndərilmiş istifadəçi şikayətləri
                </p>
              </div>

              <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setReportsFilter("reviews")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    reportsFilter === "reviews"
                      ? "bg-white dark:bg-slate-900 text-copper shadow-xs"
                      : "text-navy/70 dark:text-slate-400"
                  }`}
                >
                  Rəy Şikayətləri ({reviewReports.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReportsFilter("listings")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    reportsFilter === "listings"
                      ? "bg-white dark:bg-slate-900 text-copper shadow-xs"
                      : "text-navy/70 dark:text-slate-400"
                  }`}
                >
                  Elan Şikayətləri ({reports.length})
                </button>
              </div>
            </div>

            {/* Rəy Şikayətləri Tabı */}
            {reportsFilter === "reviews" && (
              reviewReports.length === 0 ? (
                <div className="p-12 text-center text-navy/50 dark:text-slate-400 text-sm font-medium">
                  Hazırda rəylər üzrə heç bir aktiv şikayət daxil olmayıb.
                </div>
              ) : (
                <div className="divide-y divide-navy/10 dark:divide-slate-800">
                  {reviewReports.map((rep) => {
                    const review = rep.realtor_reviews;
                    const isResolved = rep.status === "resolved" || rep.status === "dismissed";

                    return (
                      <div key={rep.id} className="p-6 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-lg">
                              ⚠️ {rep.reason}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rep.status === "resolved"
                                ? "bg-emerald-100 text-emerald-700"
                                : rep.status === "dismissed"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              Status: {rep.status === "resolved" ? "Həll olundu" : rep.status === "dismissed" ? "Rədd edildi" : "Gözləmədə"}
                            </span>
                          </div>
                          <span className="text-[11px] text-navy/40 dark:text-slate-500">
                            {rep.created_at ? new Date(rep.created_at).toLocaleDateString("az-AZ") : "Bu gün"}
                          </span>
                        </div>

                        {/* Şikayət olunan rəyin mətni */}
                        {review ? (
                          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-navy/10 dark:border-slate-700 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-navy dark:text-white">
                                Müəllif: {review.reviewer_name || "Müştəri"} · {review.rating} ⭐
                              </span>
                              {review.is_hidden && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                  Gizlədilib
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-navy/80 dark:text-slate-300 italic">
                              &ldquo;{review.comment}&rdquo;
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-navy/50 italic">
                            (Rəy artıq bazadan silinib və ya tapılmadı)
                          </p>
                        )}

                        <p className="text-xs text-navy/70 dark:text-slate-300">
                          <strong>Şikayətçinin qeydi:</strong> {rep.details || "Açıqlama yoxdur."}
                        </p>

                        {/* Admin İdarəetmə Düymələri */}
                        {!isResolved && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-navy/5 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleHideReview(rep.review_id, rep.id)}
                              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <FiEyeOff className="text-xs" /> Rəyi Gizlət
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(rep.review_id, rep.id)}
                              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <FiTrash2 className="text-xs" /> Rəyi Tam Sil
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismissReviewReport(rep.id, rep.review_id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-navy dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
                            >
                              Şikayəti Rədd Et
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Elan Şikayətləri Tabı */}
            {reportsFilter === "listings" && (
              reports.length === 0 ? (
                <div className="p-12 text-center text-navy/50 dark:text-slate-400 text-sm font-medium">
                  Hazırda elanlar üzrə heç bir aktiv şikayət yoxdur.
                </div>
              ) : (
                <div className="divide-y divide-navy/10 dark:divide-slate-800">
                  {reports.map((rep) => (
                    <div key={rep.id} className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-lg">
                          {rep.reason || "Şikayət"}
                        </span>
                        <span className="text-[11px] text-navy/40 dark:text-slate-500">
                          {rep.created_at ? new Date(rep.created_at).toLocaleDateString("az-AZ") : "Bu gün"}
                        </span>
                      </div>
                      <p className="text-xs text-navy/80 dark:text-slate-300">
                        {rep.details || "Əlavə açıqlama qeyd olunmayıb."}
                      </p>
                      {rep.listing_id && (
                        <div className="pt-1">
                          <Link
                            href={`/listings/${rep.listing_id}`}
                            className="text-xs text-copper font-bold hover:underline inline-flex items-center gap-1"
                          >
                            Elana keçid: #{rep.listing_id} <FiExternalLink />
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

      </div>
    </div>
  );
}
