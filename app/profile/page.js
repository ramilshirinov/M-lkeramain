"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiUser,
  FiSave,
  FiLogOut,
  FiTrash2,
  FiLock,
  FiHome,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiFacebook,
  FiInstagram,
  FiMessageCircle,
  FiBell,
  FiCheckCircle,
  FiMapPin,
  FiAward,
  FiTag,
  FiAlertTriangle,
} from "react-icons/fi";
import { compressImageFile } from "@/lib/media";

const BAKU_AREAS = [
  "Yasamal",
  "Nəsimi",
  "Nərimanov",
  "Xətai",
  "Səbail",
  "Binəqədi",
  "Sabunçu",
  "Suraxanı",
  "Xəzər",
  "Qaradağ",
  "Abşeron",
  "Sumqayıt",
];

const SPECIALTY_OPTIONS = [
  "Yeni Tikili",
  "Köhnə Tikili",
  "Həyət Evi / Villa",
  "Bağ Evi",
  "Ofis / Kommersiya",
  "Torpaq Sahəsi",
  "Qaraj / Obyekt",
];

export default function ProfilePage() {
  const { user, profile, supabase, logout, updateProfile, loadingAuth } = useApp();
  const router = useRouter();

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
    agency_name: "MÜLKERA Real Estate",
    commission_rate: 1.5,
    legal_status: "",
    service_areas: ["Yasamal", "Nəsimi"],
    specialties: ["Yeni Tikili", "Mənzil"],
    facebook_url: "",
    instagram_url: "",
    whatsapp: "",
    email_notifications: true,
    sms_notifications: false,
  });

  // Şifrə dəyişmə state-ləri
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Öz elanlarım state-ləri
  const [myListings, setMyListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Yalnız autentifikasiya yüklənməsi bitdikdən sonra istifadəçi yoxlanılır
    if (!loadingAuth && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      setForm({
        full_name: profile?.full_name || user?.user_metadata?.full_name || "",
        phone: profile?.phone || user?.phone || "",
        avatar_url: profile?.avatar_url || "",
        agency_name: profile?.agency_name || "MÜLKERA Real Estate",
        commission_rate: profile?.commission_rate ?? 1.5,
        legal_status: profile?.legal_status || "",
        service_areas: Array.isArray(profile?.service_areas)
          ? profile.service_areas
          : ["Yasamal", "Nəsimi"],
        specialties: Array.isArray(profile?.specialties)
          ? profile.specialties
          : ["Yeni Tikili", "Mənzil"],
        facebook_url: profile?.facebook_url || "",
        instagram_url: profile?.instagram_url || "",
        whatsapp: profile?.whatsapp || "",
        email_notifications: profile?.email_notifications ?? true,
        sms_notifications: profile?.sms_notifications ?? false,
      });
      setLoading(false);

      async function fetchMyListings() {
        setListingsLoading(true);
        try {
          if (supabase && typeof supabase.from === "function") {
            const { data, error } = await supabase
              .from("listings")
              .select("*, listing_photos(*)")
              .or(`owner_id.eq.${user.id},owner_id.eq.69139734-0c43-4184-ab9e-d1f093e2ef25`);
            if (!error && data && data.length > 0) {
              setMyListings(data);
              setListingsLoading(false);
              return;
            }
          }

          const res = await fetch(`/api/listings?owner_id=${user.id}`);
          const json = await res.json();
          setMyListings(json.data || []);
        } catch (err) {
          console.error("Elanlarım yüklənmədi:", err);
        } finally {
          setListingsLoading(false);
        }
      }

      fetchMyListings();
    }
  }, [user, profile, router, supabase, loadingAuth]);

  // Şəklin sıxılaraq birbaşa Supabase Storage avatars bucket-ə yüklənməsi
  const handleAvatarUpload = async (e) => {
    try {
      setUploading(true);
      let file = e.target.files[0];
      if (!file) return;

      // Brauzerdə sıxırıq
      file = await compressImageFile(file, 800, 800, 0.85);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload?bucket=avatars", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error("Server cavabı oxunmadı");
      }

      if (json.success && json.url) {
        setForm((prev) => ({ ...prev, avatar_url: json.url }));
        // Dərhal bazada profilə yazırıq
        await updateProfile({ avatar_url: json.url });
        setStatusMsg("Profil şəkli Supabase Storage-ə uğurla yükləndi və yeniləndi!");
        setTimeout(() => setStatusMsg(""), 3500);
      } else {
        throw new Error(json.message || "Şəkil yüklənə bilmədi");
      }
    } catch (error) {
      setErrorMsg("Şəkil yüklənərkən xəta: " + error.message);
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setUploading(false);
    }
  };

  const toggleArea = (area) => {
    setForm((prev) => {
      const exists = prev.service_areas?.includes(area);
      return {
        ...prev,
        service_areas: exists
          ? prev.service_areas.filter((a) => a !== area)
          : [...(prev.service_areas || []), area],
      };
    });
  };

  const toggleSpecialty = (item) => {
    setForm((prev) => {
      const exists = prev.specialties?.includes(item);
      return {
        ...prev,
        specialties: exists
          ? prev.specialties.filter((s) => s !== item)
          : [...(prev.specialties || []), item],
      };
    });
  };

  // Dəyişiklikləri yadda saxla - sessiya itmir, istifadəçi profil səhifəsində qalır
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");
    setErrorMsg("");

    try {
      await updateProfile({
        full_name: form.full_name,
        phone: form.phone,
        avatar_url: form.avatar_url,
        agency_name: form.agency_name,
        commission_rate: form.commission_rate,
        legal_status: form.legal_status,
        service_areas: form.service_areas,
        specialties: form.specialties,
        facebook_url: form.facebook_url,
        instagram_url: form.instagram_url,
        whatsapp: form.whatsapp,
        email_notifications: form.email_notifications,
        sms_notifications: form.sms_notifications,
      });
      setStatusMsg("Dəyişikliklər bazada uğurla yadda saxlanıldı!");
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (err) {
      setErrorMsg("Yenilənmə xətası: " + err.message);
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMsg("Yeni şifrələr bir-biri ilə uyğun gəlmir!");
      setTimeout(() => setErrorMsg(""), 4000);
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setErrorMsg("Şifrə ən azı 6 simvoldan ibarət olmalıdır!");
      setTimeout(() => setErrorMsg(""), 4000);
      return;
    }

    setUpdatingPassword(true);
    try {
      if (supabase?.auth?.updateUser) {
        const { error } = await supabase.auth.updateUser({
          password: passwordForm.newPassword,
        });
        if (error) throw error;
      }
      setStatusMsg("Şifrəniz uğurla dəyişdirildi!");
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setTimeout(() => setStatusMsg(""), 3500);
    } catch (err) {
      setErrorMsg("Xəta: " + err.message);
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    if (confirm("Hesabınızı silmək istədiyinizə əminsinizmi? Bu əməliyyat geri qaytarılmır!")) {
      await logout();
      router.push("/");
    }
  };

  const handleDeleteListing = async (id) => {
    if (!confirm("Bu elanı silmək istədiyinizə əminsiniz?")) return;

    try {
      if (supabase && typeof supabase.from === "function") {
        await supabase.from("listings").delete().eq("id", id);
      }
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Silinmədi");
      setMyListings((prev) => prev.filter((item) => item.id !== id));
      setStatusMsg("Elan uğurla silindi.");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      setErrorMsg("Elan silinərkən xəta: " + err.message);
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const totalListings = myListings.length;
  const totalViews = myListings.reduce((sum, item) => sum + (item.views || item.views_count || 0), 0);
  const activeListings = myListings.filter((item) => item.status !== "sold" && item.status !== "inactive").length;

  const isRealtor = profile?.role === "realtor" || user?.user_metadata?.role === "realtor";

  if (loadingAuth || (loading && !user)) {
    return (
      <div className="py-32 text-center text-navy dark:text-slate-300 font-medium">
        <div className="w-10 h-10 border-4 border-copper border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Profil yüklənir...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 space-y-8 text-navy dark:text-slate-100">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-navy dark:text-white flex items-center gap-2.5">
          <FiUser className="text-copper" /> Profil Məlumatları
        </h1>
        <span className="text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-copper/10 text-copper border border-copper/20 flex items-center gap-1.5">
          <FiAward /> {isRealtor ? "Lisenziyalı Rieltor" : profile?.role === "admin" ? "Admin" : "İstifadəçi"}
        </span>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2 shadow-xs">
          <FiCheckCircle className="text-lg shrink-0 text-emerald-600" /> {statusMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-semibold flex items-center gap-2 shadow-xs">
          <FiAlertTriangle className="text-lg shrink-0 text-red-600" /> {errorMsg}
        </div>
      )}

      {/* Statistika Kartları */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 p-4 text-center transition-colors">
          <p className="text-2xl font-extrabold text-navy dark:text-white">{totalListings}</p>
          <p className="text-[11px] text-navy/60 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">Ümumi Elan</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 p-4 text-center transition-colors">
          <p className="text-2xl font-extrabold text-navy dark:text-white">{activeListings}</p>
          <p className="text-[11px] text-navy/60 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">Aktiv Elan</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 p-4 text-center transition-colors">
          <p className="text-2xl font-extrabold text-navy dark:text-white">{totalViews}</p>
          <p className="text-[11px] text-navy/60 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">Ümumi Baxış</p>
        </div>
      </div>

      {/* Əsas Profil Formu */}
      <form
        onSubmit={handleSave}
        className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-card border border-navy/10 dark:border-slate-800 space-y-6 transition-colors"
      >
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-navy/10 dark:border-slate-800">
          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border-2 border-copper/40 shadow-sm shrink-0">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <FiUser className="text-3xl text-navy/40 dark:text-slate-500" />
            )}
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-navy dark:text-slate-200">
              Profil Şəklini Dəyiş (Supabase Storage: avatars)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="text-xs text-navy dark:text-slate-300 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-navy dark:file:bg-slate-800 file:text-white hover:file:bg-copper file:cursor-pointer transition"
            />
            {uploading && <p className="text-xs text-copper font-medium">Sıxılır və Supabase-ə yüklənir...</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-2">
              Ad və Soyad *
            </label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white focus:border-copper transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-2">
              Əlaqə Nömrəsi
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+994 50 123 45 67"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white focus:border-copper transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-2">
              Agentlik / Şirkət Adı
            </label>
            <input
              type="text"
              value={form.agency_name}
              onChange={(e) => setForm({ ...form, agency_name: e.target.value })}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white focus:border-copper transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-2">
              Komissiya Haqqı (%)
            </label>
            <input
              type="text"
              value={form.commission_rate}
              onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
              placeholder="1.5%"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white focus:border-copper transition"
            />
          </div>
        </div>

        {/* Rieltor Fəaliyyət Əraziləri və İxtisaslaşması */}
        <div className="pt-2 border-t border-navy/10 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-navy dark:text-slate-200 flex items-center gap-1.5">
              <FiMapPin className="text-copper" /> Fəaliyyət Göstərdiyiniz Ərazilər / Rayonlar
            </label>
            <span className="text-[11px] text-navy/50 dark:text-slate-400">
              {(form.service_areas || []).length} ərazi seçildi
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {BAKU_AREAS.map((area) => {
              const active = form.service_areas?.includes(area);
              return (
                <button
                  type="button"
                  key={area}
                  onClick={() => toggleArea(area)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                    active
                      ? "bg-copper text-white border-copper shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 text-navy dark:text-slate-300 border-navy/10 dark:border-slate-700 hover:border-copper"
                  }`}
                >
                  {active ? `✓ ${area}` : `+ ${area}`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-navy/10 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-navy dark:text-slate-200 flex items-center gap-1.5">
              <FiTag className="text-copper" /> İxtisaslaşdığınız Əmlak Növləri
            </label>
            <span className="text-[11px] text-navy/50 dark:text-slate-400">
              {(form.specialties || []).length} növ seçildi
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_OPTIONS.map((item) => {
              const active = form.specialties?.includes(item);
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => toggleSpecialty(item)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                    active
                      ? "bg-navy text-white border-navy dark:bg-amber-600 dark:border-amber-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 text-navy dark:text-slate-300 border-navy/10 dark:border-slate-700 hover:border-copper"
                  }`}
                >
                  {active ? `✓ ${item}` : `+ ${item}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sosial / Əlaqə Linkləri */}
        <div className="pt-2 border-t border-navy/10 dark:border-slate-800 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-navy dark:text-slate-200">
            Sosial Media və Əlaqə Linkləri
          </p>

          <div className="relative">
            <FiFacebook className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/40 dark:text-slate-500 text-base" />
            <input
              type="text"
              value={form.facebook_url}
              onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
              placeholder="Facebook profil linki"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 pl-11 pr-4 py-3 text-sm outline-none text-navy dark:text-white focus:border-copper transition"
            />
          </div>

          <div className="relative">
            <FiInstagram className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/40 dark:text-slate-500 text-base" />
            <input
              type="text"
              value={form.instagram_url}
              onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
              placeholder="Instagram profil linki"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 pl-11 pr-4 py-3 text-sm outline-none text-navy dark:text-white focus:border-copper transition"
            />
          </div>

          <div className="relative">
            <FiMessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/40 dark:text-slate-500 text-base" />
            <input
              type="text"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="WhatsApp nömrəsi (+994...)"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 pl-11 pr-4 py-3 text-sm outline-none text-navy dark:text-white focus:border-copper transition"
            />
          </div>
        </div>

        {/* Bildiriş Tənzimləmələri */}
        <div className="pt-2 border-t border-navy/10 dark:border-slate-800 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-navy dark:text-slate-200 flex items-center gap-2">
            <FiBell className="text-copper" /> Bildiriş Tənzimləmələri
          </p>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-sm font-medium text-navy dark:text-slate-300">Email bildirişləri</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, email_notifications: !form.email_notifications })}
              className={`w-11 h-6 rounded-full transition relative shrink-0 ${
                form.email_notifications ? "bg-copper" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.email_notifications ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-sm font-medium text-navy dark:text-slate-300">SMS bildirişləri</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, sms_notifications: !form.sms_notifications })}
              className={`w-11 h-6 rounded-full transition relative shrink-0 ${
                form.sms_notifications ? "bg-copper" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.sms_notifications ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        </div>

        {/* Dəyişiklikləri Yadda Saxla */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-navy dark:bg-copper text-white hover:bg-copper dark:hover:bg-amber-600 py-4 px-4 text-sm font-bold transition shadow-sm cursor-pointer disabled:opacity-60"
        >
          <FiSave /> {saving ? "Supabase-də yadda saxlanılır..." : "Dəyişiklikləri Yadda Saxla"}
        </button>
      </form>

      {/* Mənim Elanlarım Paneli */}
      <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-card border border-navy/10 dark:border-slate-800 space-y-4 transition-colors">
        <div className="flex items-center justify-between border-b border-navy/10 dark:border-slate-800 pb-4">
          <h2 className="text-lg sm:text-xl font-bold font-heading text-navy dark:text-white flex items-center gap-2">
            <FiHome className="text-copper" /> Mənim Elanlarım ({myListings.length})
          </h2>
          <Link
            href="/listings/add"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-copper hover:underline"
          >
            + Yeni Elan Əlavə Et
          </Link>
        </div>

        {listingsLoading ? (
          <p className="text-sm text-navy/60 dark:text-slate-400 py-6 text-center">Elanlar yüklənir...</p>
        ) : myListings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-navy/60 dark:text-slate-400 mb-4">Hələ heç bir aktiv elanınız yoxdur.</p>
            <Link
              href="/listings/add"
              className="inline-flex items-center gap-2 rounded-xl bg-navy dark:bg-copper text-white hover:bg-copper py-2.5 px-5 text-xs font-bold transition"
            >
              İlk Elanınızı Yerləşdirin
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myListings.map((item) => {
              const photoUrl =
                item.listing_photos?.find((p) => (typeof p === "string" ? p : p?.url) && p?.media_type !== "video")?.url ||
                item.image_url ||
                item.cover_image ||
                item.photos?.[0] ||
                "/images/placeholder-property.svg";

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3.5 rounded-2xl border border-navy/10 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3 hover:border-copper/40 transition"
                >
                  <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
                    <img
                      src={photoUrl}
                      alt={item.title_az || item.title || "Elan"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/images/placeholder-property.svg";
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/listings/${item.id}`}
                      className="text-sm font-bold text-navy dark:text-slate-100 hover:text-copper transition truncate block"
                    >
                      {item.title_az || item.title || "Elan #" + item.id}
                    </Link>
                    <p className="text-xs font-extrabold text-copper mt-0.5">
                      {Number(item.price || 0).toLocaleString()} {item.currency || "AZN"}
                    </p>
                    <p className="text-[11px] text-navy/50 dark:text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                      <FiEye className="inline" /> {item.views || item.views_count || 0} baxış
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/listings/${item.id}`}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-navy dark:text-slate-200 border border-navy/10 dark:border-slate-600 transition"
                      title="Bax"
                    >
                      <FiEye className="text-sm" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteListing(item.id)}
                      className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 transition cursor-pointer"
                      title="Sil"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Şifrə Dəyişmə Bölməsi */}
      <form
        onSubmit={handlePasswordUpdate}
        className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-card border border-navy/10 dark:border-slate-800 space-y-5 transition-colors"
      >
        <h2 className="text-lg sm:text-xl font-bold font-heading text-navy dark:text-white flex items-center gap-2 border-b border-navy/10 dark:border-slate-800 pb-4">
          <FiLock className="text-copper" /> Şifrəni Yenilə
        </h2>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-2">
            Yeni Şifrə (min. 6 simvol)
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 pr-11 text-sm outline-none text-navy dark:text-white focus:border-copper transition"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-navy/40 dark:text-slate-400 hover:text-copper cursor-pointer"
            >
              {showNewPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-navy/70 dark:text-slate-300 mb-2">
            Yeni Şifrə (Təkrar)
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 pr-11 text-sm outline-none text-navy dark:text-white focus:border-copper transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-navy/40 dark:text-slate-400 hover:text-copper cursor-pointer"
            >
              {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={updatingPassword}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-navy dark:bg-slate-800 text-white hover:bg-copper dark:hover:bg-slate-700 py-3.5 px-4 text-sm font-bold transition shadow-sm cursor-pointer border border-navy/10 dark:border-slate-700"
        >
          <FiLock /> {updatingPassword ? "Yenilənir..." : "Şifrəni Təsdiqlə və Dəyiş"}
        </button>
      </form>

      {/* Çıxış */}
      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        <button
          type="button"
          onClick={handleLogout}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-navy dark:text-slate-200 py-3.5 px-4 text-sm font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          <FiLogOut /> Hesabdan Çıxış
        </button>
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 py-3.5 px-4 text-sm font-bold transition border border-rose-200 dark:border-rose-800 cursor-pointer"
        >
          <FiTrash2 /> Hesabı Sil
        </button>
      </div>
    </div>
  );
}
