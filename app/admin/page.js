"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  FiShield,
  FiActivity,
  FiHome,
  FiUsers,
  FiAlertTriangle,
  FiServer,
  FiRefreshCw,
  FiSearch,
  FiEye,
  FiCheck,
  FiX,
  FiTrash2,
  FiStar,
  FiExternalLink,
  FiLock,
  FiLogOut,
  FiClock,
  FiGlobe,
  FiCheckCircle,
  FiAlertCircle,
  FiLayers,
  FiDollarSign,
  FiPhone,
  FiMail,
  FiUserCheck,
  FiUserX,
  FiVideo,
  FiKey,
} from "react-icons/fi";

const ACTION_LABELS = {
  ALL: "Bütün Hadisələr",
  AUTH_LOGIN: "Daxil Olma (Login)",
  AUTH_LOGOUT: "Çıxış (Logout)",
  AUTH_REGISTER: "Yeni Qeydiyyat",
  PAGE_VISIT: "Səhifə Ziyarəti",
  LISTING_CREATE: "Yeni Elan Əlavəsi",
  ADMIN_LISTING_UPDATE: "Elan Redaktəsi (Admin)",
  ADMIN_LISTING_DELETE: "Elan Silinməsi (Admin)",
  ADMIN_USER_UPDATE: "İstifadəçi Dəyişikliyi",
  ADMIN_REPORT_UPDATE: "Şikayət Baxışı",
  SYSTEM_START: "Sistem Hadisəsi",
};

export default function AdminPage() {
  // Avtorizasiya vəziyyəti
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [adminUser, setAdminUser] = useState(null);

  // Naviqasiya və Tab-lar
  const [activeTab, setActiveTab] = useState("overview"); // overview, activities, listings, users, reports, system
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState("");

  // Məlumatlar
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activityFilter, setActivityFilter] = useState("all");
  const [activitySearch, setActivitySearch] = useState("");

  const [listings, setListings] = useState([]);
  const [listingFilter, setListingFilter] = useState("all");
  const [listingSearch, setListingSearch] = useState("");

  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");

  const [reports, setReports] = useState([]);

  // Bildiriş göstərmə köməkçisi
  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

  // 1. Admin statusunu yoxlayırıq
  const checkAuth = useCallback(async () => {
    setCheckingAuth(true);
    try {
      const res = await fetch("/api/admin/auth-check");
      const data = await res.json();
      if (res.ok && data.success && data.isAdmin) {
        setIsAuthorized(true);
        if (data.user) setAdminUser(data.user);
      } else {
        setIsAuthorized(false);
      }
    } catch {
      setIsAuthorized(false);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 2. Parol ilə giriş
  const handlePasscodeLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/admin/auth-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passcode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthorized(true);
        setPasscode("");
        showToast("Admin panelinə giriş təsdiqləndi.");
      } else {
        setAuthError(data.message || "Parol yanlışdır.");
      }
    } catch (err) {
      setAuthError("Giriş xətası baş verdi.");
    }
  };

  // 3. Admin çıxışı
  const handleLogout = async () => {
    await fetch("/api/admin/auth-check", { method: "DELETE" });
    setIsAuthorized(false);
    setAdminUser(null);
  };

  // 4. Əsas məlumatların yüklənməsi
  const loadData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      // Statistika və son fəaliyyətlər
      const [statsRes, actRes, listRes, usersRes, repRes] = await Promise.all([
        fetch("/api/admin/stats").then((r) => r.json().catch(() => ({}))),
        fetch(`/api/admin/activities?limit=100&filter=${activityFilter}`).then((r) => r.json().catch(() => ({}))),
        fetch(`/api/admin/listings?status=${listingFilter}&q=${encodeURIComponent(listingSearch)}`).then((r) => r.json().catch(() => ({}))),
        fetch(`/api/admin/users?role=${userRoleFilter}&q=${encodeURIComponent(userSearch)}`).then((r) => r.json().catch(() => ({}))),
        fetch("/api/admin/reports").then((r) => r.json().catch(() => ({}))),
      ]);

      if (statsRes?.success) setStats(statsRes.stats);
      if (actRes?.success) setActivities(actRes.logs || []);
      if (listRes?.success) setListings(listRes.listings || []);
      if (usersRes?.success) setUsers(usersRes.users || []);
      if (repRes?.success) setReports(repRes.reports || []);
    } catch (err) {
      console.error("Məlumat yüklənmə xətası:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, activityFilter, listingFilter, listingSearch, userRoleFilter, userSearch]);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized, loadData]);

  // Avtomatik yenilənmə (Real-time monitoring: 12 saniyədən bir)
  useEffect(() => {
    if (!isAuthorized || !autoRefresh) return;
    const interval = setInterval(() => {
      // Yalnız yüngül sorğuları (fəaliyyətlər və statistikanı) avtomatik təzələyirik
      fetch("/api/admin/stats")
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setStats(d.stats);
            if (activeTab === "activities" || activeTab === "overview") {
              setActivities(d.recentActivities || []);
            }
          }
        })
        .catch(() => {});
    }, 12000);

    return () => clearInterval(interval);
  }, [isAuthorized, autoRefresh, activeTab]);

  // ---- Əməliyyatlar: Elanlar ----
  const handleUpdateListingStatus = async (id, status) => {
    try {
      const res = await fetch("/api/admin/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Elan statusu "${status}" olaraq yeniləndi.`);
        setListings((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
        loadData();
      }
    } catch {
      showToast("Xəta baş verdi.");
    }
  };

  const handleToggleVip = async (id, currentVip) => {
    try {
      const res = await fetch("/api/admin/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_vip: !currentVip }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(!currentVip ? "Elan VIP edildi." : "VIP statusu çıxarıldı.");
        setListings((prev) => prev.map((item) => (item.id === id ? { ...item, is_vip: !currentVip } : item)));
      }
    } catch {
      showToast("Xəta baş verdi.");
    }
  };

  const handleDeleteListing = async (id) => {
    if (!confirm("Bu elanı bazadan həmişəlik silmək istəyirsiniz?")) return;
    try {
      const res = await fetch(`/api/admin/listings?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Elan uğurla silindi.");
        setListings((prev) => prev.filter((item) => item.id !== id));
        loadData();
      }
    } catch {
      showToast("Silinmə xətası.");
    }
  };

  // ---- Əməliyyatlar: İstifadəçilər ----
  const handleApproveRealtor = async (id, approve) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          role: "realtor",
          is_approved_realtor: approve,
          approval_status: approve ? "approved" : "rejected",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(approve ? "Rieltor təsdiqləndi!" : "Rieltor rədd edildi.");
        setUsers((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, is_approved_realtor: approve, approval_status: approve ? "approved" : "rejected" } : u
          )
        );
        loadData();
      }
    } catch {
      showToast("Xəta baş verdi.");
    }
  };

  const handleChangeRole = async (id, newRole) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Rol "${newRole}" olaraq təyin edildi.`);
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
      }
    } catch {
      showToast("Xəta baş verdi.");
    }
  };

  // ---- Əməliyyatlar: Şikayətlər ----
  const handleUpdateReport = async (id, status) => {
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Şikayət "${status}" olaraq qeyd edildi.`);
        setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      }
    } catch {
      showToast("Xəta baş verdi.");
    }
  };

  // Süzgəcdən keçmiş fəaliyyət qeydləri
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchesSearch =
        !activitySearch ||
        act.user_email?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        act.user_name?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        act.details?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        act.ip?.includes(activitySearch);

      return matchesSearch;
    });
  }, [activities, activitySearch]);

  // Əgər auth yoxlanılırsa
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <FiRefreshCw className="text-3xl text-copper animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide">MÜLKERA Admin Təhlükəsizliyi Yoxlanılır...</p>
      </div>
    );
  }

  // Əgər avtorizasiya olunmayıbsa — Təhlükəsiz Giriş Ekranı
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-copper to-amber-500 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl shadow-lg shadow-copper/20">
              <FiShield />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">MÜLKERA ADMIN PANELİ</h1>
            <p className="text-xs text-slate-400">
              Platformaya tam nəzarət, ziyarətçi izləməsi və idarəetmə mərkəzi.
            </p>
          </div>

          <form onSubmit={handlePasscodeLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Admin Təhlükəsizlik Parolu
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Master parolu daxil edin"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-copper transition"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <FiAlertCircle className="shrink-0 text-base" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-copper hover:bg-amber-600 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-copper/25 cursor-pointer text-sm"
            >
              Panellə Təhlükəsiz Əlaqə Qur
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-copper transition inline-flex items-center gap-1.5"
            >
              <FiGlobe /> Əsas vebsayta qayıt
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ƏSAS ADMİN PANELİ İNTERFEYSİ
  // =========================================================================
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Toast Bildirişi */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-copper text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <FiCheckCircle className="text-base" />
          <span>{notification}</span>
        </div>
      )}

      {/* Yuxarı Başlıq və Naviqasiya Paneli */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/90 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-copper to-amber-500 rounded-xl flex items-center justify-center text-white text-xl shadow-md shadow-copper/20">
            <FiShield />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white">MÜLKERA</span>
              <span className="bg-copper/20 text-copper text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border border-copper/30">
                Super Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Canlı Nəzarət və İdarəetmə Mərkəzi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Real-time yenilənmə düyməsi */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              autoRefresh
                ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
            title="Hər 12 saniyədən bir avtomatik təzələnmə"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            <span className="hidden sm:inline">{autoRefresh ? "Canlı İzləmə: Aktiv" : "Canlı İzləmə: Dayandırılıb"}</span>
          </button>

          {/* Əl ilə yeniləmə */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700/80 cursor-pointer"
            title="Bütün məlumatları yenilə"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
          </button>

          {/* Əsas sayta keçid */}
          <Link
            href="/"
            target="_blank"
            className="px-3.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700/80"
          >
            <FiGlobe size={14} className="text-copper" />
            <span className="hidden sm:inline">Vebsayta Keç</span>
            <FiExternalLink size={12} className="opacity-70" />
          </Link>

          {/* Çıxış düyməsi */}
          <button
            onClick={handleLogout}
            className="p-2 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl transition border border-red-800/80 cursor-pointer"
            title="Paneldən çıx"
          >
            <FiLogOut size={16} />
          </button>
        </div>
      </header>

      {/* Əsas Panel Gövdəsi */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Yan Menyu (Tabs Sidebar) */}
        <aside className="w-full lg:w-64 bg-slate-900/60 border-b lg:border-b-0 lg:border-r border-slate-800/80 p-4 space-y-1.5 shrink-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "overview"
                ? "bg-copper text-white shadow-md shadow-copper/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FiLayers className="text-base" />
              <span>İcmal & Statistika</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("activities")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "activities"
                ? "bg-copper text-white shadow-md shadow-copper/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FiActivity className="text-base" />
              <span>Ziyarətçilər & Fəaliyyət</span>
            </div>
            <span className="bg-slate-800/80 text-[10px] px-2 py-0.5 rounded-full font-mono">
              {activities.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("listings")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "listings"
                ? "bg-copper text-white shadow-md shadow-copper/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FiHome className="text-base" />
              <span>Elanların İdarəsi</span>
            </div>
            <span className="bg-slate-800/80 text-[10px] px-2 py-0.5 rounded-full font-mono">
              {stats?.listings?.total ?? listings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "users"
                ? "bg-copper text-white shadow-md shadow-copper/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FiUsers className="text-base" />
              <span>İstifadəçilər & Rieltorlar</span>
            </div>
            {stats?.users?.pendingRealtors > 0 && (
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {stats.users.pendingRealtors} yeni
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "reports"
                ? "bg-copper text-white shadow-md shadow-copper/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FiAlertTriangle className="text-base" />
              <span>Şikayətlər</span>
            </div>
            {stats?.reports?.pending > 0 && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {stats.reports.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("system")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "system"
                ? "bg-copper text-white shadow-md shadow-copper/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FiServer className="text-base" />
              <span>Sistem & Status</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </button>
        </aside>

        {/* Əsas Məzmun Sahəsi */}
        <main className="flex-1 p-4 sm:p-8 space-y-8 overflow-y-auto max-w-7xl">
          {/* ========================================================================= */}
          {/* TAB 1: İCMAL & STATİSTİKA                                                 */}
          {/* ========================================================================= */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Statistika Kartları */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-semibold">Ümumi Elanlar</span>
                    <FiHome className="text-copper text-lg" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    {stats?.listings?.total || 0}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="text-emerald-400 font-semibold">{stats?.listings?.active || 0} aktiv</span>
                    <span>•</span>
                    <span className="text-amber-400 font-semibold">{stats?.listings?.sold || 0} satılıb</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-semibold">Qeydiyyatlı İstifadəçilər</span>
                    <FiUsers className="text-copper text-lg" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    {stats?.users?.total || 0}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="text-cyan-400 font-semibold">{stats?.users?.realtors || 0} rieltor</span>
                    {stats?.users?.pendingRealtors > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-400 font-bold">{stats?.users?.pendingRealtors} təsdiq gözləyən</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-semibold">Ümumi Baxış Sayı</span>
                    <FiEye className="text-copper text-lg" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    {stats?.listings?.totalViews ? stats.listings.totalViews.toLocaleString() : 0}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Bütün elanlar üzrə toplam baxış
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-semibold">Gözləyən Şikayətlər</span>
                    <FiAlertTriangle className="text-red-400 text-lg" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    {stats?.reports?.pending || 0}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {stats?.reports?.pending > 0 ? "Baxılmalı şikayətlər var" : "Şikayət yoxdur (Sistem sakitdir)"}
                  </div>
                </div>
              </div>

              {/* Sürətli Keçid Kartları və Son Hadisələr */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Son Fəaliyyətlər (Canlı İzləmə) */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <FiActivity className="text-copper" /> Canlı Fəaliyyət Jurnalı ("Kim nə edir?")
                      </h2>
                      <p className="text-xs text-slate-400">
                        Platformadakı ən son giriş-çıxış və istifadəçi hərəkətləri
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("activities")}
                      className="text-xs text-copper hover:underline font-semibold"
                    >
                      Hamısına Bax →
                    </button>
                  </div>

                  <div className="divide-y divide-slate-800/80">
                    {activities.slice(0, 7).map((act) => (
                      <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-copper text-sm shrink-0 mt-0.5">
                            {act.action === "AUTH_LOGIN" ? <FiKey /> : act.action === "PAGE_VISIT" ? <FiEye /> : <FiActivity />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200">
                                {act.user_name || act.user_email || "Qonaq"}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">
                                {act.role || "guest"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5">{act.details || act.action}</p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                              <span>IP: {act.ip || "127.0.0.1"}</span>
                              <span>•</span>
                              <span>{new Date(act.created_at).toLocaleTimeString("az-AZ")}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                          {new Date(act.created_at).toLocaleDateString("az-AZ")}
                        </span>
                      </div>
                    ))}
                    {activities.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Hələlik heç bir fəaliyyət qeydi tapılmadı.
                      </div>
                    )}
                  </div>
                </div>

                {/* Sürətli Əmrlər və Status */}
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FiServer className="text-copper" /> Sistem Vəziyyəti
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                        <span className="text-slate-400">Verilənlər Bazası (Supabase)</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Aktiv
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                        <span className="text-slate-400">Telegram Video Storage</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Qoşulub
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                        <span className="text-slate-400">Next.js App Router (Node.js)</span>
                        <span className="text-cyan-400 font-bold">16.3.4 (Production)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                    <h3 className="text-sm font-bold text-white">Sürətli Əməliyyatlar</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => { setActiveTab("users"); setUserRoleFilter("realtor"); }}
                        className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-200 transition flex items-center justify-between"
                      >
                        <span>Rieltor Təsdiqlərinə Bax</span>
                        <span className="text-copper">→</span>
                      </button>
                      <button
                        onClick={() => { setActiveTab("listings"); setListingFilter("pending"); }}
                        className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-200 transition flex items-center justify-between"
                      >
                        <span>Gözləyən Elanları İncələ</span>
                        <span className="text-copper">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ZİYARƏTÇİLƏR VƏ FƏALİYYƏT JURNALI ("KİM GİRİR, ÇIXIR, NƏ EDİR")     */}
          {/* ========================================================================= */}
          {activeTab === "activities" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiActivity className="text-copper" /> Ziyarətçilər və Fəaliyyət Jurnalı
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Sayta kim daxil olub, hansı səhifələrə baxıb, kim elan əlavə edib və ya qeydiyyatdan keçib.
                  </p>
                </div>
              </div>

              {/* Axtarış və Hadisə Növü Süzgəcləri */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="İstifadəçi adı, e-poçt, IP və ya fəaliyyət axtar..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-copper"
                  />
                </div>

                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-copper"
                >
                  <option value="all">Bütün Hadisə Növləri</option>
                  <option value="PAGE_VISIT">Səhifə Ziyarətləri</option>
                  <option value="AUTH_LOGIN">Daxil Olmalar (Login)</option>
                  <option value="AUTH_LOGOUT">Çıxışlar (Logout)</option>
                  <option value="AUTH_REGISTER">Yeni Qeydiyyatlar</option>
                  <option value="LISTING_CREATE">Elan Əlavələri</option>
                  <option value="ADMIN_LISTING_UPDATE">Admin Düzəlişləri</option>
                </select>
              </div>

              {/* Fəaliyyət Cədvəli */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                        <th className="py-3.5 px-4">İstifadəçi / Ziyarətçi</th>
                        <th className="py-3.5 px-4">Görülən İş (Hadisə)</th>
                        <th className="py-3.5 px-4">Detallar</th>
                        <th className="py-3.5 px-4">IP & Cihaz</th>
                        <th className="py-3.5 px-4 text-right">Tarix & Saat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {filteredActivities.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">
                              {log.user_name || "Qonaq Ziyarətçi"}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {log.user_email || "qonaq@ziyaretci"}
                            </div>
                            <span className="inline-block mt-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {log.role || "guest"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              log.action === "AUTH_LOGIN"
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                                : log.action === "AUTH_REGISTER"
                                ? "bg-cyan-950/80 text-cyan-300 border border-cyan-800/60"
                                : log.action === "LISTING_CREATE"
                                ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                                : log.action?.startsWith("ADMIN")
                                ? "bg-purple-950/80 text-purple-300 border border-purple-800/60"
                                : "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}>
                              {ACTION_LABELS[log.action] || log.action}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-300 max-w-xs break-words">
                            {log.details || "—"}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                            <div>{log.ip || "127.0.0.1"}</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                              {log.user_agent || "Bilinməyən"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                            <div>{new Date(log.created_at).toLocaleTimeString("az-AZ")}</div>
                            <div className="text-[10px] text-slate-500">
                              {new Date(log.created_at).toLocaleDateString("az-AZ")}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredActivities.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                            Heç bir fəaliyyət qeydi tapılmadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ELANLARIN İDARƏSİ                                                  */}
          {/* ========================================================================= */}
          {activeTab === "listings" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiHome className="text-copper" /> Elanların İdarəsi
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Saytdakı bütün elanları təsdiqləyin, rədd edin, VIP statusu verin və ya silin.
                  </p>
                </div>
              </div>

              {/* Axtarış və Status filteri */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Elan başlığı, ünvan axtar..."
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-copper"
                  />
                </div>

                <select
                  value={listingFilter}
                  onChange={(e) => setListingFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-copper"
                >
                  <option value="all">Bütün Statuslar</option>
                  <option value="active">Yalnız Aktiv Elanlar</option>
                  <option value="pending">Təsdiq Gözləyən Elanlar</option>
                  <option value="sold">Satılmış Elanlar</option>
                  <option value="rejected">Rədd Edilmişlər</option>
                </select>
              </div>

              {/* Elanlar Cədvəli */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                        <th className="py-3.5 px-4">Elan / Başlıq</th>
                        <th className="py-3.5 px-4">Qiymət & Məkan</th>
                        <th className="py-3.5 px-4">Elan Sahibi</th>
                        <th className="py-3.5 px-4">Status & VIP</th>
                        <th className="py-3.5 px-4 text-right">Əməliyyatlar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {listings.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-bold text-white truncate">
                              {item.title_az || item.title || "Başlıqsız"}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Baxış: {item.views_count || item.view_count || 0}</span>
                              <span>•</span>
                              <span>{new Date(item.created_at).toLocaleDateString("az-AZ")}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-copper">
                              {Number(item.price).toLocaleString()} {item.currency || "AZN"}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                              {item.address || "Ünvan qeyd olunmayıb"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-200">
                              {item.profiles?.full_name || "Naməlum"}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.phone_number || item.profiles?.phone || item.profiles?.email || "Əlaqə yoxdur"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                item.status === "active"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                  : item.status === "pending"
                                  ? "bg-amber-950 text-amber-400 border border-amber-800"
                                  : item.status === "sold"
                                  ? "bg-blue-950 text-blue-400 border border-blue-800"
                                  : "bg-red-950 text-red-400 border border-red-800"
                              }`}>
                                {item.status}
                              </span>

                              {item.is_vip && (
                                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <FiStar size={10} /> VIP
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Saytda Baxış */}
                              <Link
                                href={`/listings/${item.id}`}
                                target="_blank"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                                title="Elana bax"
                              >
                                <FiExternalLink size={14} />
                              </Link>

                              {/* VIP dəyiş */}
                              <button
                                onClick={() => handleToggleVip(item.id, item.is_vip)}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  item.is_vip
                                    ? "bg-amber-900/60 text-amber-300 hover:bg-amber-900"
                                    : "bg-slate-800 text-slate-400 hover:text-amber-400"
                                }`}
                                title={item.is_vip ? "VIP-dən çıxar" : "VIP et"}
                              >
                                <FiStar size={14} />
                              </button>

                              {/* Təsdiqlə (Aktiv et) */}
                              {item.status !== "active" && (
                                <button
                                  onClick={() => handleUpdateListingStatus(item.id, "active")}
                                  className="p-1.5 bg-emerald-950 text-emerald-400 hover:bg-emerald-900 rounded-lg transition cursor-pointer"
                                  title="Elanı təsdiq et (Aktiv et)"
                                >
                                  <FiCheck size={14} />
                                </button>
                              )}

                              {/* İmtina et */}
                              {item.status === "active" && (
                                <button
                                  onClick={() => handleUpdateListingStatus(item.id, "rejected")}
                                  className="p-1.5 bg-amber-950 text-amber-400 hover:bg-amber-900 rounded-lg transition cursor-pointer"
                                  title="Elanı rədd et"
                                >
                                  <FiX size={14} />
                                </button>
                              )}

                              {/* Sil */}
                              <button
                                onClick={() => handleDeleteListing(item.id)}
                                className="p-1.5 bg-red-950 text-red-400 hover:bg-red-900 rounded-lg transition cursor-pointer"
                                title="Elanı sil"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {listings.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                            Heç bir elan tapılmadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: İSTİFADƏÇİLƏR VƏ RİELTORLAR                                         */}
          {/* ========================================================================= */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiUsers className="text-copper" /> İstifadəçilər və Rieltorlar
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    İstifadəçi rollarını idarə edin, rieltorluq müraciətlərini təsdiqləyin və ya ləğv edin.
                  </p>
                </div>
              </div>

              {/* Axtarış və Rol Filteri */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Ad, e-poçt və ya telefon nömrəsi ilə axtar..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-copper"
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-copper"
                >
                  <option value="all">Bütün İstifadəçilər</option>
                  <option value="realtor">Rieltorlar</option>
                  <option value="customer">Müştərilər</option>
                  <option value="admin">Adminlər</option>
                </select>
              </div>

              {/* İstifadəçilər Cədvəli */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                        <th className="py-3.5 px-4">Ad & E-poçt</th>
                        <th className="py-3.5 px-4">Telefon</th>
                        <th className="py-3.5 px-4">Rol</th>
                        <th className="py-3.5 px-4">Rieltor Statusu</th>
                        <th className="py-3.5 px-4 text-right">Əməliyyatlar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{u.full_name || "Adsız"}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {u.phone || "—"}
                          </td>

                          <td className="py-3.5 px-4">
                            <select
                              value={u.role || "customer"}
                              onChange={(e) => handleChangeRole(u.id, e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-copper cursor-pointer"
                            >
                              <option value="customer">Müştəri</option>
                              <option value="realtor">Rieltor</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>

                          <td className="py-3.5 px-4">
                            {u.role === "realtor" ? (
                              u.is_approved_realtor ? (
                                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                  <FiCheck size={10} /> Təsdiqlənib
                                </span>
                              ) : (
                                <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                  <FiClock size={10} /> Təsdiq Gözləyir
                                </span>
                              )
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {u.role === "realtor" && !u.is_approved_realtor && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleApproveRealtor(u.id, true)}
                                  className="px-2.5 py-1 bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <FiCheck size={12} /> Təsdiqlə
                                </button>
                                <button
                                  onClick={() => handleApproveRealtor(u.id, false)}
                                  className="px-2.5 py-1 bg-red-950 text-red-400 hover:bg-red-900 border border-red-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <FiX size={12} /> Rədd et
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}

                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                            İstifadəçi tapılmadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: ŞİKAYƏTLƏR                                                         */}
          {/* ========================================================================= */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FiAlertTriangle className="text-copper" /> Şikayətlər və Moderasiya
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  İstifadəçilərin elanlar barədə göndərdiyi şikayətləri nəzərdən keçirin.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="divide-y divide-slate-800/80">
                  {reports.map((rep) => (
                    <div key={rep.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-400 bg-red-950/60 border border-red-800/80 px-2 py-0.5 rounded">
                            {rep.reason || "Şikayət"}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            rep.status === "pending"
                              ? "bg-amber-950 text-amber-400 border border-amber-800"
                              : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          }`}>
                            {rep.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium">
                          {rep.details || "Əlavə qeyd göstərilməyib."}
                        </p>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span>Şikayət edən: {rep.reporter?.full_name || rep.reporter?.email || "Anonim"}</span>
                          <span>•</span>
                          <span>{new Date(rep.created_at).toLocaleString("az-AZ")}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {rep.listing_id && (
                          <Link
                            href={`/listings/${rep.listing_id}`}
                            target="_blank"
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                          >
                            <FiEye size={14} /> Elana Bax
                          </Link>
                        )}
                        {rep.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleUpdateReport(rep.id, "resolved")}
                              className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-bold cursor-pointer"
                            >
                              Həll Edildi
                            </button>
                            <button
                              onClick={() => handleUpdateReport(rep.id, "dismissed")}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-bold cursor-pointer"
                            >
                              Rədd Et
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {reports.length === 0 && (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      Hələlik heç bir şikayət daxil olmayıb.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: SİSTEM & STATUS                                                    */}
          {/* ========================================================================= */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FiServer className="text-copper" /> Sistem & Server Diaqnostikası
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Mülkera platformasının server və bulud inteqrasiyalarının cari vəziyyəti.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FiDatabase className="text-copper" /> Verilənlər Bazası (Supabase PostgreSQL)
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Status</span>
                      <span className="text-emerald-400 font-bold">Qoşulub (Connected)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">RLS (Row Level Security)</span>
                      <span className="text-emerald-400 font-bold">Aktivdir</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Audit Logs Cədvəli</span>
                      <span className="text-slate-300 font-mono">public.audit_logs</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FiVideo className="text-copper" /> Video Saxlama (Telegram Cloud)
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Bot Adı</span>
                      <span className="text-white font-mono">@Mulkera_media_bot</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Kanal ID</span>
                      <span className="text-white font-mono">-1004457929838</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Stream Proxy</span>
                      <span className="text-emerald-400 font-bold">HTTP 206 Range Dəstəklənir</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FiDatabase(props) {
  return <FiServer {...props} />;
}
