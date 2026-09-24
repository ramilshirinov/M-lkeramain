"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useApp } from "@/context/AppContext";
import {
  fetchCategories,
  fetchDistricts,
  fetchListingById,
  updateListing,
  replaceListingMedia,
  localizedField,
} from "@/lib/listings";
import MediaUploader from "@/components/MediaUploader";
import { FiCheckCircle, FiAlertCircle, FiEdit3 } from "react-icons/fi";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-[320px] w-full animate-pulse rounded-xl bg-slate-100 flex items-center justify-center text-navy/60">Xəritə yüklənir...</div>,
});

const DOCUMENT_OPTIONS = ["Çıxarış", "Kupça", "Texniki pasport", "Notarial müqavilə", "Digər"];

export default function EditListingPage() {
  const { id } = useParams();
  const { t, user, supabase, loadingAuth } = useApp();
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [form, setForm] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);

  useEffect(() => {
    fetchCategories(supabase).then(setCategories).catch(() => {});
    fetchDistricts(supabase).then(setDistricts).catch(() => {});
  }, [supabase]);

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push(`/login?redirect=/listings/${id}/edit`);
    }
  }, [loadingAuth, user, id, router]);

  useEffect(() => {
    async function load() {
      const data = await fetchListingById(supabase, id);
      if (!data) {
        setLoading(false);
        return;
      }
      const ownerId = data.owner_id || data.user_id;
      if (user && ownerId && ownerId !== user.id && user.role !== "admin") {
        setNotAllowed(true);
        setLoading(false);
        return;
      }

      setForm({
        title_az: data.title_az || data.title || "",
        title_ru: data.title_ru || "",
        title_en: data.title_en || "",
        description_az: data.description_az || data.description || "",
        description_ru: data.description_ru || "",
        description_en: data.description_en || "",
        category_id: data.category_id || "",
        district_id: data.district_id || "",
        transaction_type: data.transaction_type || "sale",
        price: data.price || "",
        currency: data.currency || "AZN",
        room_count: data.room_count || "",
        area_m2: data.area_m2 || "",
        yard_sot: data.yard_sot || "",
        floor_number: data.floor_number || "",
        total_floors: data.total_floors || "",
        address: data.address || "",
        latitude: data.latitude || 40.4093,
        longitude: data.longitude || 49.8671,
        phone_number: data.phone_number || "",
        documents: data.documents || [],
      });

      let existingPhotos = (data.listing_photos || [])
        .filter((p) => p.media_type === "image")
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => ({ url: p.url, name: "existing", type: "image" }));

      if (existingPhotos.length === 0 && data.image_url) {
        existingPhotos = [{ url: data.image_url, name: "existing", type: "image" }];
      }
        
      let existingVideos = (data.listing_photos || [])
        .filter((p) => p.media_type === "video")
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => ({ url: p.url, name: "existing", type: "video" }));

      if (existingVideos.length === 0 && data.video_url) {
        existingVideos = [{ url: data.video_url, name: "existing", type: "video" }];
      }

      setImageFiles(existingPhotos);
      setVideoFiles(existingVideos);
      setLoading(false);
    }
    if (user) load();
  }, [id, supabase, user]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

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
    setErrors({});

    const fieldErrors = {};
    if (!form.title_az) fieldErrors.title_az = true;
    if (!form.description_az) fieldErrors.description_az = true;
    if (!form.category_id) fieldErrors.category_id = true;
    if (!form.district_id) fieldErrors.district_id = true;
    if (!form.price || Number(form.price) <= 0) fieldErrors.price = true;
    if (!form.area_m2 || Number(form.area_m2) <= 0) fieldErrors.area_m2 = true;
    if (!form.address) fieldErrors.address = true;
    if (!form.phone_number) fieldErrors.phone_number = true;
    if (imageFiles.length === 0) fieldErrors.images = true;

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title_az: form.title_az,
        title: form.title_az,
        title_ru: form.title_ru || null,
        title_en: form.title_en || null,
        description_az: form.description_az,
        description: form.description_az,
        description_ru: form.description_ru || null,
        description_en: form.description_en || null,
        category_id: form.category_id ? Number(form.category_id) : null,
        district_id: form.district_id ? Number(form.district_id) : null,
        transaction_type: form.transaction_type,
        price: Number(form.price),
        currency: form.currency,
        room_count: form.room_count ? Number(form.room_count) : null,
        area_m2: Number(form.area_m2),
        yard_sot: form.yard_sot ? Number(form.yard_sot) : null,
        floor_number: form.floor_number ? Number(form.floor_number) : null,
        total_floors: form.total_floors ? Number(form.total_floors) : null,
        address: form.address,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        documents: form.documents,
        phone_number: form.phone_number,
      };

      await updateListing(supabase, id, payload);
      await replaceListingMedia(supabase, id, {
        photoUrls: imageFiles.map((f) => f.url || f),
        videoUrls: videoFiles.map((f) => f.url || f),
      });

      setSuccess(true);
      setTimeout(() => router.push(`/listings/${id}`), 1200);
    } catch (err) {
      console.error(err);
      alert("Xəta baş verdi: " + (err.message || "Naməlum xəta"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAuth || loading) {
    return <div className="py-32 text-center text-navy/60 font-medium">Məlumatlar yüklənir...</div>;
  }

  if (notAllowed) {
    return (
      <div className="mx-auto max-w-md px-4 py-32 text-center">
        <FiAlertCircle size={40} className="mx-auto mb-4 text-red-400" />
        <p className="text-navy/70 font-medium">Bu elanı redaktə etməyə icazəniz yoxdur.</p>
      </div>
    );
  }

  if (!form) {
    return <div className="py-32 text-center text-navy/60">Elan tapılmadı.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold font-heading text-navy">
        <FiEdit3 className="text-copper" /> Elanı Redaktə Et
      </h1>
      <p className="mb-8 text-sm text-navy/65">Zəhmət olmasa dəyişiklikləri qeyd edin.</p>

      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700 border border-emerald-200">
          <FiCheckCircle className="text-lg" /> Elan uğurla yeniləndi! Səhifə yönləndirilir...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ƏSAS MƏLUMATLAR */}
        <section className="card-surface p-6 sm:p-8 bg-white rounded-2xl shadow-card border border-navy/10 space-y-6">
          <h2 className="text-lg font-bold text-navy border-b pb-3">Əsas Məlumatlar</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Başlıq (AZ) *</label>
              <input
                value={form.title_az}
                onChange={(e) => update("title_az", e.target.value)}
                className={`w-full rounded-xl bg-slate-50 border px-4 py-3 text-sm outline-none text-navy focus:border-copper transition ${
                  errors.title_az ? "border-red-400 bg-red-50/30" : "border-navy/15"
                }`}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">Başlıq (RU)</label>
                <input value={form.title_ru} onChange={(e) => update("title_ru", e.target.value)} className="w-full rounded-xl bg-slate-50 border border-navy/15 px-4 py-3 text-sm outline-none text-navy focus:border-copper transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">Başlıq (EN)</label>
                <input value={form.title_en} onChange={(e) => update("title_en", e.target.value)} className="w-full rounded-xl bg-slate-50 border border-navy/15 px-4 py-3 text-sm outline-none text-navy focus:border-copper transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Ətraflı Məlumat (AZ) *</label>
              <textarea
                rows={4}
                value={form.description_az}
                onChange={(e) => update("description_az", e.target.value)}
                className={`w-full rounded-xl bg-slate-50 border px-4 py-3 text-sm outline-none text-navy focus:border-copper transition resize-none ${
                  errors.description_az ? "border-red-400 bg-red-50/30" : "border-navy/15"
                }`}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">Kateqoriya *</label>
                <select
                  value={form.category_id}
                  onChange={(e) => update("category_id", e.target.value)}
                  className={`w-full rounded-xl bg-slate-50 border px-4 py-3 text-sm outline-none text-navy focus:border-copper transition ${
                    errors.category_id ? "border-red-400 bg-red-50/30" : "border-navy/15"
                  }`}
                >
                  <option value="">— Seçin —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{localizedField(c, "name", "az")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">Əməliyyat Növü *</label>
                <select
                  value={form.transaction_type}
                  onChange={(e) => update("transaction_type", e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-navy/15 px-4 py-3 text-sm outline-none text-navy focus:border-copper transition"
                >
                  <option value="sale">Satış</option>
                  <option value="long_term_rent">Uzunmüddətli kirayə</option>
                  <option value="daily_rent">Günlük kirayə</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* MEDIA FAYLLAR */}
        <section className="card-surface p-6 sm:p-8 bg-white rounded-2xl shadow-card border border-navy/10 space-y-4">
          <h2 className="text-lg font-bold text-navy border-b pb-3">Şəkil və Videolar</h2>
          <div className="space-y-5">
            <MediaUploader
              files={imageFiles}
              setFiles={setImageFiles}
              accept="image/*"
              type="image"
              label="Şəkil Faylları (Ən azı 1 ədəd) *"
            />
            {errors.images && <p className="text-xs text-red-500 font-medium">⚠️ Zəhmət olmasa, ən azı bir şəkil əlavə edin.</p>}

            <MediaUploader
              files={videoFiles}
              setFiles={setVideoFiles}
              accept="video/*"
              type="video"
              label="Video Faylı (Könüllü)"
            />
          </div>
        </section>

        {/* MƏKAN VƏ ÜNVAN */}
        <section className="card-surface p-6 sm:p-8 bg-white rounded-2xl shadow-card border border-navy/10 space-y-4">
          <h2 className="text-lg font-bold text-navy border-b pb-3">Məkan və Ünvan</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Rayon / Bölgə *</label>
              <select
                value={form.district_id}
                onChange={(e) => update("district_id", e.target.value)}
                className={`w-full rounded-xl bg-slate-50 border px-4 py-3 text-sm outline-none text-navy focus:border-copper transition ${
                  errors.district_id ? "border-red-400 bg-red-50/30" : "border-navy/15"
                }`}
              >
                <option value="">— Rayon seçin —</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{localizedField(d, "name", "az")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Ünvan / Küçə *</label>
              <input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className={`w-full rounded-xl bg-slate-50 border px-4 py-3 text-sm outline-none text-navy focus:border-copper transition ${
                  errors.address ? "border-red-400 bg-red-50/30" : "border-navy/15"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Xəritədə Dəqiq Yer</label>
              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(lat, lng) => {
                  if (typeof lat === "object" && lat !== null) {
                    update("latitude", lat.lat);
                    update("longitude", lat.lng);
                  } else {
                    update("latitude", lat);
                    update("longitude", lng);
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* ƏMLAK PARAMETrlƏRİ */}
        <section className="card-surface p-6 sm:p-8 bg-white rounded-2xl shadow-card border border-navy/10 space-y-4">
          <h2 className="text-lg font-bold text-navy border-b pb-3">Əmlakın Parametrləri</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Qiymət *</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                className={`w-full rounded-xl bg-slate-50 border px-4 py-3 text-sm outline-none text-navy focus:border-copper transition ${
                  errors.price ? "border-red-400 bg-red-50/30" : "border-navy/15"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Valyuta</label>
              <select
                value={form.currency}
                onChange={(e) => update("currency", e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-navy/15 px-4 py-3 text-sm outline-none text-navy focus:border-copper transition"
              >
                <option value="AZN">AZN (₼)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Sahə (m²) *</label>
              <input
                type="number"
                min="0"
                value={form.area_m2}
                onChange={(e) => update("area_m2", e.target.value)}
                className={`w-full rounded-xl bg-slate-50 border px-4 py-3 text-sm outline-none text-navy focus:border-copper transition ${
                  errors.area_m2 ? "border-red-400 bg-red-50/30" : "border-navy/15"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Otaq sayı</label>
              <input type="number" min="0" value={form.room_count} onChange={(e) => update("room_count", e.target.value)} className="w-full rounded-xl bg-slate-50 border border-navy/15 px-4 py-3 text-sm outline-none text-navy focus:border-copper transition" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Həyət sahəsi (sot)</label>
              <input type="number" min="0" value={form.yard_sot} onChange={(e) => update("yard_sot", e.target.value)} className="w-full rounded-xl bg-slate-50 border border-navy/15 px-4 py-3 text-sm outline-none text-navy focus:border-copper transition" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Mərtəbə</label>
              <input type="number" min="0" value={form.floor_number} onChange={(e) => update("floor_number", e.target.value)} className="w-full rounded-xl bg-slate-50 border border-navy/15 px-4 py-3 text-sm outline-none text-navy focus:border-copper transition" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Binanın ümumi mərtəbəsi</label>
              <input type="number" min="0" value={form.total_floors} onChange={(e) => update("total_floors", e.target.value)} className="w-full rounded-xl bg-slate-50 border border-navy/15 px-4 py-3 text-sm outline-none text-navy focus:border-copper transition" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-navy mb-2">Əlaqə Nömrəsi *</label>
              <input
                type="text"
                value={form.phone_number}
                onChange={(e) => update("phone_number", e.target.value)}
                className={`w-full rounded-xl bg-slate-50 border px-4 py-3 text-sm outline-none text-navy focus:border-copper transition ${
                  errors.phone_number ? "border-red-400 bg-red-50/30" : "border-navy/15"
                }`}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-navy mb-2">Sənədlər</label>
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_OPTIONS.map((doc) => (
                <button
                  key={doc}
                  type="button"
                  onClick={() => toggleDocument(doc)}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                    form.documents.includes(doc)
                      ? "border-copper bg-copper/10 text-copper"
                      : "border-navy/15 text-navy/60 hover:border-copper/50"
                  }`}
                >
                  {doc}
                </button>
              ))}
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-navy text-white hover:bg-copper py-4 px-4 text-base font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {submitting ? "Yenilənir..." : "Dəyişiklikləri Yadda Saxla"}
        </button>
      </form>
    </div>
  );
}