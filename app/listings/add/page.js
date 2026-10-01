"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  fetchCategories,
  fetchDistricts,
  createListing,
  localizedField,
} from "@/lib/listings";
import { normalizeAzPhone } from "@/lib/phone";
import { AZERBAIJAN_REGIONS } from "@/constants/locations";
import MediaUploader from "@/components/MediaUploader";
import { FiPlusCircle, FiCheckCircle, FiHome, FiDollarSign, FiMapPin, FiLayers, FiUserCheck } from "react-icons/fi";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

const INITIAL_FORM = {
  title_az: "",
  description_az: "",
  category_id: "",
  transaction_type: "sale",
  owner_kind: "",
  price: "",
  currency: "AZN",
  room_count: "",
  area_m2: "",
  yard_sot: "",
  floor_number: "",
  total_floors: "",
  selected_city: "baku",
  district_name: "",
  district_id: "",
  address: "",
  latitude: "",
  longitude: "",
  phone_number: "",
  documents: ["Kupça (Çıxarış)"],
};

const DOC_OPTIONS = [
  "Kupça (Çıxarış)",
  "Müqavilə",
  "Sərəncam",
  "Bələdiyyə sənədi",
  "Qeydiyyat vəsiqəsi",
  "Dövlət aktı",
  "Digər",
];

const KINDS = ["owner", "realtor", "other"];

export default function AddListingPage() {
  const router = useRouter();
  const { user, profile, loadingAuth, locale, supabase, t } = useApp();

  const [form, setForm] = useState(INITIAL_FORM);
  const [categories, setCategories] = useState([]);
  const [dbDistricts, setDbDistricts] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadsBusy, setUploadsBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const requestIdRef = useRef(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    requestIdRef.current = crypto.randomUUID();
  }, []);

  const activeRegion = AZERBAIJAN_REGIONS.find((r) => r.id === form.selected_city) || AZERBAIJAN_REGIONS[0];
  const currentDistricts = activeRegion?.districts || [];

  useEffect(() => {
    fetchCategories(supabase).then(setCategories).catch(() => {});
    fetchDistricts(supabase).then(setDbDistricts).catch(() => {});
  }, [supabase]);

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push("/login?redirect=/listings/add");
    }
  }, [loadingAuth, user, router]);

  // Pre-fill phone and suggested owner_kind from profile
  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        phone_number: prev.phone_number || profile.phone || "",
        owner_kind: prev.owner_kind || (profile.role === "realtor" ? "realtor" : ""),
      }));
    }
  }, [profile]);

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: false }));
  };

  const toggleDocument = (doc) => {
    setForm((f) => ({
      ...f,
      documents: f.documents.includes(doc)
        ? f.documents.filter((d) => d !== doc)
        : [...f.documents, doc],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current || uploadsBusy) return;

    setErrors({});
    setFormError("");

    const fieldErrors = {};
    if (!form.title_az?.trim()) fieldErrors.title_az = true;
    if (!form.description_az?.trim()) fieldErrors.description_az = true;
    if (!form.category_id) fieldErrors.category_id = true;
    if (!form.selected_city) fieldErrors.selected_city = true;
    if (!form.price || Number(form.price) <= 0) fieldErrors.price = true;
    if (!form.area_m2 || Number(form.area_m2) <= 0) fieldErrors.area_m2 = true;
    if (!form.address?.trim()) fieldErrors.address = true;

    // Phone validation
    const normalizedPhone = normalizeAzPhone(form.phone_number);
    if (!normalizedPhone) {
      fieldErrors.phone_number = true;
    }

    // Owner kind validation
    if (!form.owner_kind || !KINDS.includes(form.owner_kind)) {
      fieldErrors.owner_kind = true;
    }

    // Coordinates validation (prevent Baku default stacking)
    if (!form.latitude || !form.longitude) {
      fieldErrors.location = true;
    }

    // Images validation
    if (imageFiles.length === 0) {
      fieldErrors.images = true;
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setFormError(
        t?.errors?.generic || "Zəhmət olmasa qırmızı ilə işarələnmiş məcburi xanaları doldurun."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const cityName = activeRegion?.name || "Bakı";
      const fullAddress = `${cityName}${form.district_name ? ", " + form.district_name : ""}, ${form.address.trim()}`;

      const listingPayload = {
        title: form.title_az.trim(),
        title_az: form.title_az.trim(),
        description: form.description_az.trim(),
        description_az: form.description_az.trim(),
        transaction_type: form.transaction_type || "sale",
        category_id: form.category_id === "other" ? null : form.category_id,
        district_id: form.district_id || (dbDistricts[0]?.id || null),
        city: cityName,
        address: fullAddress,
        latitude: form.latitude ? String(form.latitude) : null,
        longitude: form.longitude ? String(form.longitude) : null,
        price: String(form.price),
        currency: form.currency || "AZN",
        area_m2: String(form.area_m2),
        room_count: form.room_count ? String(form.room_count) : null,
        floor: form.floor_number ? String(form.floor_number) : null,
        floor_total: form.total_floors ? String(form.total_floors) : null,
        yard_sot: form.yard_sot ? String(form.yard_sot) : null,
        phone_number: normalizedPhone.e164,
        documents: form.documents,
        owner_kind: form.owner_kind,
      };

      const media = [
        ...imageFiles.map((f) => ({ url: f.url || f, type: "image" })),
        ...videoFiles.map((f) => ({ url: f.url || f, type: "video" })),
      ];

      await createListing(supabase, {
        requestId: requestIdRef.current,
        listing: listingPayload,
        media,
      });

      setSuccess(true);
      setTimeout(() => router.push("/listings"), 1200);
    } catch (err) {
      console.error("Listing creation error:", err);
      submittingRef.current = false;
      setSubmitting(false);
      const code = err.code || err.message;
      const localizedMsg =
        t?.errors?.[code] || err.message || t?.errors?.generic || "Elan əlavə edilərkən xəta baş verdi.";
      setFormError(localizedMsg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loadingAuth || !user) {
    return <div className="py-32 text-center text-navy/60 dark:text-slate-400 font-medium">Yüklənir...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 text-navy dark:text-slate-100 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-10">
      <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold font-heading text-navy dark:text-white">
        <FiPlusCircle className="text-copper" /> Yeni Elan Yerləşdir
      </h1>
      <p className="mb-8 text-sm text-navy/65 dark:text-slate-400">Zəhmət olmasa tələb olunan sahələri doldurun.</p>

      {formError && (
        <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-950/40 p-4 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
          {formError}
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <FiCheckCircle className="text-lg" /> Elan uğurla əlavə olundu! Səhifə yönləndirilir...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Elan Sahibi Seçimi (Step 12.2) */}
        <section className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 space-y-4 transition-colors">
          <h2 className="text-lg font-bold text-navy dark:text-white border-b border-navy/10 dark:border-slate-800 pb-3 flex items-center gap-2">
            <FiUserCheck className="text-copper" /> {t?.addListing?.ownerKind || "Elan sahibi"} *
          </h2>
          {errors.owner_kind && (
            <p className="text-xs text-red-500 font-semibold">{t?.errors?.owner_kind_required || "Elan sahibi növünü seçin."}</p>
          )}
          <fieldset className="grid grid-cols-3 gap-3">
            <legend className="sr-only">{t?.addListing?.ownerKind || "Elan sahibi"}</legend>
            {KINDS.map((k) => (
              <label
                key={k}
                className={`cursor-pointer rounded-xl border p-3.5 text-center text-sm font-semibold transition ${
                  form.owner_kind === k
                    ? "border-copper bg-copper/10 text-copper font-bold shadow-sm"
                    : "border-navy/15 dark:border-slate-700 hover:border-copper/60 text-navy dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50"
                }`}
              >
                <input
                  type="radio"
                  name="owner_kind"
                  value={k}
                  checked={form.owner_kind === k}
                  onChange={() => update("owner_kind", k)}
                  className="sr-only"
                />
                {t?.ownerKind?.[k] || (k === "owner" ? "Mülkiyyətçi" : k === "realtor" ? "Rieltor" : "Digər")}
              </label>
            ))}
          </fieldset>
        </section>

        {/* Əsas Məlumatlar */}
        <section className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 space-y-6 transition-colors">
          <h2 className="text-lg font-bold text-navy dark:text-white border-b border-navy/10 dark:border-slate-800 pb-3 flex items-center gap-2">
            <FiHome className="text-copper" /> Əsas Məlumatlar
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Elanın Başlığı *</label>
              <input
                value={form.title_az}
                onChange={(e) => update("title_az", e.target.value)}
                placeholder="Məs: Nəsimi rayonunda 3 otaqlı təmirli mənzil"
                className={`w-full rounded-xl bg-slate-50 dark:bg-slate-800 border px-4 py-3 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition ${
                  errors.title_az ? "border-red-400 bg-red-50/30" : "border-navy/15 dark:border-slate-700"
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Ətraflı Məlumat *</label>
              <textarea
                rows={4}
                value={form.description_az}
                onChange={(e) => update("description_az", e.target.value)}
                placeholder="Əmlak haqqında ətraflı məlumat, təmir vəziyyəti, infrastruktur..."
                className={`w-full rounded-xl bg-slate-50 dark:bg-slate-800 border px-4 py-3 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition resize-none ${
                  errors.description_az ? "border-red-400 bg-red-50/30" : "border-navy/15 dark:border-slate-700"
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Kateqoriya *</label>
                <select
                  value={form.category_id}
                  onChange={(e) => update("category_id", e.target.value)}
                  className={`w-full rounded-xl bg-slate-50 dark:bg-slate-800 border px-4 py-3 text-sm outline-none text-navy dark:text-white focus:border-copper transition ${
                    errors.category_id ? "border-red-400 bg-red-50/30" : "border-navy/15 dark:border-slate-700"
                  }`}
                >
                  <option value="">— Kateqoriya seçin —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{localizedField(c, "name", locale || "az")}</option>
                  ))}
                  <option value="other">Digər</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Əməliyyat Növü *</label>
                <select
                  value={form.transaction_type}
                  onChange={(e) => update("transaction_type", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white focus:border-copper transition"
                >
                  <option value="sale">{t?.transactionTypes?.sale || "Satış"}</option>
                  <option value="rent">{t?.transactionTypes?.long_term_rent || "Kirayə"}</option>
                  <option value="daily_rent">{t?.transactionTypes?.daily_rent || "Günlük"}</option>
                  <option value="other">{t?.transactionTypes?.other || "Digər"}</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Qiymət və Parametrlər */}
        <section className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 space-y-6 transition-colors">
          <h2 className="text-lg font-bold text-navy dark:text-white border-b border-navy/10 dark:border-slate-800 pb-3 flex items-center gap-2">
            <FiDollarSign className="text-copper" /> Qiymət və Sahə Göstəriciləri
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Qiymət *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  placeholder="Məs: 150000"
                  className={`w-full rounded-xl bg-slate-50 dark:bg-slate-800 border px-4 py-3 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition ${
                    errors.price ? "border-red-400 bg-red-50/30" : "border-navy/15 dark:border-slate-700"
                  }`}
                />
                <select
                  value={form.currency}
                  onChange={(e) => update("currency", e.target.value)}
                  className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white focus:border-copper"
                >
                  <option value="AZN">AZN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Sahə (m²) *</label>
              <input
                type="number"
                min="1"
                value={form.area_m2}
                onChange={(e) => update("area_m2", e.target.value)}
                placeholder="Məs: 85"
                className={`w-full rounded-xl bg-slate-50 dark:bg-slate-800 border px-4 py-3 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition ${
                  errors.area_m2 ? "border-red-400 bg-red-50/30" : "border-navy/15 dark:border-slate-700"
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Otaq Sayı</label>
              <input
                type="number"
                min="1"
                value={form.room_count}
                onChange={(e) => update("room_count", e.target.value)}
                placeholder="Məs: 3"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Həyət / Torpaq Sahəsi (sot)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.yard_sot}
                onChange={(e) => update("yard_sot", e.target.value)}
                placeholder="Məs: 4.5"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Yerləşdiyi Mərtəbə</label>
              <input
                type="number"
                min="1"
                value={form.floor_number}
                onChange={(e) => update("floor_number", e.target.value)}
                placeholder="Məs: 5"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Ümumi Mərtəbə Sayı</label>
              <input
                type="number"
                min="1"
                value={form.total_floors}
                onChange={(e) => update("total_floors", e.target.value)}
                placeholder="Məs: 16"
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition"
              />
            </div>
          </div>
        </section>

        {/* Ünvan və Məkan */}
        <section className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 space-y-6 transition-colors">
          <h2 className="text-lg font-bold text-navy dark:text-white border-b border-navy/10 dark:border-slate-800 pb-3 flex items-center gap-2">
            <FiMapPin className="text-copper" /> Ərazi və Ünvan
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Şəhər / Region *</label>
                <select
                  value={form.selected_city}
                  onChange={(e) => update("selected_city", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white focus:border-copper"
                >
                  {AZERBAIJAN_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Rayon / Ərazi</label>
                <select
                  value={form.district_name}
                  onChange={(e) => update("district_name", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 px-4 py-3 text-sm outline-none text-navy dark:text-white focus:border-copper"
                >
                  <option value="">— Rayon seçin —</option>
                  {currentDistricts.map((d) => (
                    <option key={d.id || d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Dəqiq Ünvan (Küçə, Bina) *</label>
              <input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Məs: Nizami küç. 45, mənzil 12"
                className={`w-full rounded-xl bg-slate-50 dark:bg-slate-800 border px-4 py-3 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition ${
                  errors.address ? "border-red-400 bg-red-50/30" : "border-navy/15 dark:border-slate-700"
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">Əlaqə Telefonu *</label>
              <input
                type="tel"
                inputMode="tel"
                value={form.phone_number}
                onChange={(e) => update("phone_number", e.target.value)}
                placeholder="+994 50 123 45 67"
                className={`w-full rounded-xl bg-slate-50 dark:bg-slate-800 border px-4 py-3 text-sm outline-none text-navy dark:text-white placeholder:text-navy/40 dark:placeholder:text-slate-500 focus:border-copper transition ${
                  errors.phone_number ? "border-red-400 bg-red-50/30" : "border-navy/15 dark:border-slate-700"
                }`}
              />
              {errors.phone_number && (
                <p className="mt-1 text-xs text-red-500">{t?.errors?.phone_required || "Düzgün Azərbaycan mobil nömrəsi daxil edin (+994 XX XXX XX XX)."}</p>
              )}
            </div>

            <div className="pt-2">
              <label className="block text-sm font-semibold text-navy dark:text-slate-200 mb-2">
                İnteraktiv Xəritədə Məkanı Qeyd Edin *
              </label>
              {errors.location && (
                <p className="mb-2 text-xs text-red-500 font-semibold">Zəhmət olmasa xəritədə əmlakın yerləşdiyi nöqtəni vurun.</p>
              )}
              <LocationPicker
                latitude={form.latitude ? Number(form.latitude) : 40.4093}
                longitude={form.longitude ? Number(form.longitude) : 49.8671}
                onChange={(lat, lng) => {
                  if (lat && lng && typeof lat === "number") {
                    update("latitude", lat);
                    update("longitude", lng);
                  } else if (typeof lat === "object" && lat !== null) {
                    update("latitude", lat.lat);
                    update("longitude", lat.lng);
                  }
                }}
              />
              {form.latitude && form.longitude && (
                <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Seçilmiş koordinatlar: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Sənədlər */}
        <section className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 space-y-4 transition-colors">
          <h2 className="text-lg font-bold text-navy dark:text-white border-b border-navy/10 dark:border-slate-800 pb-3 flex items-center gap-2">
            <FiLayers className="text-copper" /> Mövcud Sənədlər
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DOC_OPTIONS.map((doc) => {
              const checked = form.documents.includes(doc);
              return (
                <button
                  type="button"
                  key={doc}
                  onClick={() => toggleDocument(doc)}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition cursor-pointer flex items-center justify-between ${
                    checked
                      ? "bg-navy dark:bg-copper text-white border-navy dark:border-copper shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800 text-navy/70 dark:text-slate-300 border-navy/15 dark:border-slate-700 hover:border-copper"
                  }`}
                >
                  <span>{doc}</span>
                  {checked && <FiCheckCircle />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Media Yükləmə */}
        <section className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 space-y-4 transition-colors">
          <h2 className="text-lg font-bold text-navy dark:text-white border-b border-navy/10 dark:border-slate-800 pb-3">
            Şəkil və Video Yüklə *
          </h2>
          {errors.images && (
            <p className="text-xs text-red-500 font-semibold">{t?.errors?.media_required || "Ən azı 1 ədəd şəkil yükləmək məcburidir."}</p>
          )}
          <div className="space-y-4">
            <MediaUploader
              files={imageFiles}
              setFiles={setImageFiles}
              accept="image/*"
              type="image"
              label="Şəkillər əlavə edin *"
              onBusyChange={setUploadsBusy}
            />
            <MediaUploader
              files={videoFiles}
              setFiles={setVideoFiles}
              accept="video/*"
              type="video"
              label="Video əlavə edin (istəyə bağlı)"
              onBusyChange={setUploadsBusy}
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={submitting || uploadsBusy}
          className="w-full rounded-2xl bg-navy dark:bg-copper hover:bg-copper dark:hover:bg-amber-600 text-white py-4 px-6 font-bold text-base transition shadow-md cursor-pointer disabled:opacity-50"
        >
          {uploadsBusy
            ? (t?.upload?.uploading || "Fayllar yüklənir…")
            : submitting
            ? "Elan yerləşdirilir..."
            : "Elanı Təsdiqlə və Dərc Et"}
        </button>
      </form>
    </div>
  );
}
