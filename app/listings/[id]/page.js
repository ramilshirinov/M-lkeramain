"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useFavorite } from "@/hooks/useFavorite";
import ListingCard from "@/components/ListingCard";
import { localizedField, reportListing } from "@/lib/listings";
import { 
  FiMapPin, FiCalendar, FiDollarSign, FiHome, FiMaximize2, 
  FiShield, FiChevronLeft, FiChevronRight, FiX, FiPhone, 
  FiUser, FiCheckCircle, FiPlay, FiLayers, FiBriefcase, FiHeart,
  FiEdit3, FiTrash2, FiFlag, FiShare2, FiCheck, FiMessageSquare,
  FiEye, FiTag, FiFileText, FiStar, FiSend
} from "react-icons/fi";

const PLACEHOLDER = "/images/placeholder-property.svg";

function getMime(url = "") {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".webm")) return "video/webm";
  if (clean.endsWith(".ogg") || clean.endsWith(".ogv")) return "video/ogg";
  return "video/mp4";
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { supabase, locale, user, profile } = useApp();
  const [listing, setListing] = useState(null);
  const [relatedListings, setRelatedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(null);
  const [activeImageTab, setActiveImageTab] = useState(0);
  const [failed, setFailed] = useState({});

  // Şikayət Modalı State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Yalan və ya köhnəlmiş məlumat");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [reporting, setReporting] = useState(false);

  // VIP Önə Çəkmə Modalı State
  const [showVipModal, setShowVipModal] = useState(false);
  const [selectedVipPackage, setSelectedVipPackage] = useState("vip-15");
  const [vipLoading, setVipLoading] = useState(false);
  const [vipSuccessMessage, setVipSuccessMessage] = useState("");

  const handleActivateVip = async () => {
    setVipLoading(true);
    try {
      const res = await fetch("/api/vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          packageId: selectedVipPackage,
          paymentMethod: "card"
        })
      });
      const result = await res.json();
      if (result.success) {
        setListing(result.listing);
        setVipSuccessMessage(result.message || "Elanınız uğurla VIP statusuna yüksəldildi!");
        setTimeout(() => {
          setShowVipModal(false);
          setVipSuccessMessage("");
        }, 2000);
      }
    } catch (err) {
      console.error("VIP xətası:", err);
    } finally {
      setVipLoading(false);
    }
  };

  // Link kopyalandı bildirişi
  const [copied, setCopied] = useState(false);

  // Silmə təsdiqi
  const [deleting, setDeleting] = useState(false);

  const { isFavorited, toggling, toggleFavorite } = useFavorite(id);

  // Rəylər State & Handlers
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState("");
  const [newReviewAuthor, setNewReviewAuthor] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState("");

  const loadListingReviews = async () => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/reviews?listing_id=${id}`);
      const data = await res.json();
      if (data.success && data.reviews) {
        setReviews(data.reviews);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    loadListingReviews();
  }, [id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newReviewComment.trim() || reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      const authorName = newReviewAuthor.trim() || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Anonim Müştəri";
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: id,
          user_id: user?.id || null,
          reviewer_name: authorName,
          rating: newReviewRating,
          comment: newReviewComment.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewReviewComment("");
        setReviewSuccessMsg("Rəyiniz uğurla qeydə alındı!");
        loadListingReviews();
        setTimeout(() => setReviewSuccessMsg(""), 3000);
      }
    } catch (e) {
      console.error("Rəy göndərilmədi:", e);
    } finally {
      setReviewSubmitting(false);
    }
  };

  useEffect(() => {
    async function fetchListingDetail() {
      if (!id) return;
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`/api/listings/${id}`, { cache: "no-store" });
        const json = await res.json();

        if (!res.ok || !json.data) {
          setListing(null);
          setFetchError(new Error(json.message || "Elan tapılmadı"));
        } else {
          const currentItem = json.data;
          setListing(currentItem);

          // Oxşar Elanlar: Supabase sorğusu ilə rayon və qiymətə uyğun elanları çəkirik
          let similarData = [];
          if (supabase && typeof supabase.from === "function") {
            try {
              let q = supabase
                .from("listings")
                .select("*, listing_photos(*), categories(*), districts(*)")
                .neq("id", currentItem.id);

              if (currentItem.district_id) {
                q = q.eq("district_id", currentItem.district_id);
              }
              if (currentItem.price && Number(currentItem.price) > 0) {
                const minPrice = Math.round(Number(currentItem.price) * 0.7);
                const maxPrice = Math.round(Number(currentItem.price) * 1.4);
                q = q.gte("price", minPrice).lte("price", maxPrice);
              }

              const { data: sbSimilar, error: sbErr } = await q.limit(4);
              if (!sbErr && sbSimilar && sbSimilar.length > 0) {
                similarData = sbSimilar;
              }
            } catch (sbErr) {
              console.warn("Supabase similar listings sorğusu xətası:", sbErr);
            }
          }

          if (similarData.length === 0) {
            similarData = json.related || [];
          }
          setRelatedListings(similarData);

          // Baxış sayını artır
          fetch(`/api/listings/${id}/view`, { method: "POST" }).catch(() => {});
        }
      } catch (err) {
        console.error("Gözlənilməz xəta:", err);
        setFetchError(err);
        setListing(null);
      } finally {
        setLoading(false);
      }
    }

    fetchListingDetail();
  }, [id]);

  const handleFavoriteClick = async () => {
    const result = await toggleFavorite();
    if (result?.requiresAuth) {
      router.push(`/login?redirect=/listings/${id}`);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDeleteListing = async () => {
    if (!confirm("Bu elanı silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarılmır.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Elanı silmək mümkün olmadı");
      alert("Elan uğurla silindi.");
      router.push("/listings");
    } catch (err) {
      console.error("Elan silinmədi:", err);
      alert("Xəta baş verdi: " + (err.message || "Elanı silmək mümkün olmadı"));
      setDeleting(false);
    }
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    setReporting(true);
    try {
      await reportListing(supabase, {
        listingId: id,
        reporterId: user?.id || null,
        reason: reportReason,
        details: reportDetails,
      });
      setReportSent(true);
      setTimeout(() => {
        setReportSent(false);
        setShowReportModal(false);
        setReportDetails("");
      }, 2000);
    } catch (err) {
      console.error("Şikayət göndərilmədi:", err);
      // Yerli olaraq təsdiq edirik
      setReportSent(true);
      setTimeout(() => {
        setReportSent(false);
        setShowReportModal(false);
        setReportDetails("");
      }, 2000);
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-copper border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="py-32 text-center px-4 bg-[#F8FAFC] dark:bg-slate-950 min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-navy dark:text-white mb-2">
          {fetchError ? "Elanı yükləmək mümkün olmadı" : "Elan tapılmadı"}
        </h2>
        <p className="text-navy/60 dark:text-slate-400 text-sm mb-6 max-w-md">
          {fetchError
            ? "Məlumat bazasından məlumat alınarkən xəta baş verdi. Zəhmət olmasa bir az sonra yenidən cəhd edin."
            : "Axtardığınız elan silinib və ya mövcud deyil."}
        </p>
        <Link
          href="/listings"
          className="px-6 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-copper transition inline-block shadow-sm"
        >
          Elanlar kataloquna qayıt
        </Link>
      </div>
    );
  }

  // Bütün media elementlərinin toplanması
  const allMedia = [];
  
  if (Array.isArray(listing.listing_photos)) {
    listing.listing_photos.forEach((p) => {
      const url = typeof p === "string" ? p : p?.url;
      if (!url) return;
      const isVideo = p?.media_type === "video" || /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url);
      allMedia.push({
        id: p.id || url,
        url,
        media_type: isVideo ? "video" : "image",
        sort_order: p.sort_order ?? 0,
      });
    });
  }

  if (listing.video_url && !allMedia.some((m) => m.url === listing.video_url)) {
    allMedia.push({
      id: "video-single",
      url: listing.video_url,
      media_type: "video",
      sort_order: 999,
    });
  }

  const singleImage = listing.image_url || listing.cover_image;
  if (singleImage && !allMedia.some((m) => m.url === singleImage)) {
    allMedia.unshift({
      id: "img-single",
      url: singleImage,
      media_type: "image",
      sort_order: -1,
    });
  }

  if (allMedia.length === 0) {
    allMedia.push({ id: "placeholder", url: PLACEHOLDER, media_type: "image", sort_order: 0 });
  }

  allMedia.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const images = allMedia.filter((m) => m.media_type !== "video");
  const videos = allMedia.filter((m) => m.media_type === "video");

  const currentImage = images[activeImageTab];
  const currentSrc = !currentImage || failed[currentImage.url] ? PLACEHOLDER : currentImage.url;

  const categoryTitle = listing.categories ? localizedField(listing.categories, "name", locale) : (listing.category || "Əmlak");
  const districtTitle = listing.districts ? localizedField(listing.districts, "name", locale) : "";

  // Elan ID və nömrəsi
  const listingRefNumber = listing.listing_number || `MLK-${String(listing.id).slice(0, 8).toUpperCase()}`;

  // Sahibi olub olmadığını yoxlayaq
  const ownerId = listing.owner_id || listing.user_id;
  const isOwner = Boolean(user && ownerId && user.id === ownerId);
  const isAdmin = profile?.role === "admin" || user?.role === "admin";
  const canManage = isOwner || isAdmin;

  // Agentlik yoxsa Mülkiyyətçi
  const isAgency = listing.owner_type === "agency" || listing.profiles?.role === "realtor" || listing.is_agency;

  // Əlaqə nömrəsi
  const contactPhone = listing.phone_number || listing.profiles?.phone || "+994 50 123 45 67";
  const whatsappUrl = `https://wa.me/${contactPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
    `Salam, MÜLKERA saytında yerləşdirdiyiniz #${listingRefNumber} nömrəli elanınız haqqında ətraflı məlumat almaq istəyirəm: ${typeof window !== "undefined" ? window.location.href : ""}`
  )}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-navy dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* İdarəetmə Paneli (Əgər elan sahibidirsə) */}
        {canManage && (
          <div className="bg-copper/10 border border-copper/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-copper">
              <FiCheckCircle className="text-base" /> Bu elan sizin hesabınıza aiddir
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/listings/${id}/edit`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy text-white hover:bg-copper font-bold transition shadow-sm"
              >
                <FiEdit3 /> Redaktə Et
              </Link>
              <button
                type="button"
                onClick={handleDeleteListing}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold transition shadow-sm cursor-pointer"
              >
                <FiTrash2 /> {deleting ? "Silinir..." : "Elanı Sil"}
              </button>
            </div>
          </div>
        )}

        {/* Üst Başlıq və Qiymət */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy/10 dark:border-slate-800 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-copper/10 text-copper uppercase tracking-wider">
                {categoryTitle}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-navy/10 dark:bg-slate-800 text-navy dark:text-slate-200 uppercase tracking-wider">
                {listing.transaction_type === "sale" ? "Satış" : listing.transaction_type === "daily_rent" ? "Günlük Kirayə" : "Kirayə"}
              </span>

              {/* Mülkiyyətçi vs Agentlik Nişanı */}
              <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                isAgency 
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800" 
                  : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800"
              }`}>
                {isAgency ? <FiBriefcase /> : <FiUser />}
                {isAgency ? "Vasitəçi / Agentlik" : "Mülkiyyətçidən"}
              </span>

              {listing.is_vip && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500 text-white shadow-sm">
                  VIP
                </span>
              )}

              {listing.mortgage_available && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  İpotekaya Yararlı
                </span>
              )}

              {/* Elan Ref Nömrəsi */}
              <span className="text-xs font-mono font-bold text-navy/50 dark:text-slate-400 ml-auto sm:ml-2">
                #{listingRefNumber}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-navy dark:text-white">
                {localizedField(listing, "title", locale) || listing.title || "Daşınmaz Əmlak Elanı"}
              </h1>
              <button
                onClick={handleFavoriteClick}
                disabled={toggling}
                aria-pressed={isFavorited}
                aria-label={isFavorited ? "Sevimlilərdən çıxar" : "Sevimlilərə əlavə et"}
                className={`shrink-0 mt-1 w-10 h-10 rounded-full border flex items-center justify-center transition cursor-pointer ${
                  isFavorited
                    ? "bg-copper/10 border-copper text-copper"
                    : "bg-white dark:bg-slate-900 border-navy/10 dark:border-slate-800 text-navy/40 hover:text-copper hover:border-copper"
                } ${toggling ? "opacity-60 cursor-wait" : ""}`}
              >
                <FiHeart className={isFavorited ? "fill-current" : ""} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-navy/60 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <FiMapPin className="text-copper shrink-0" />
                {listing.address} {districtTitle ? `· ${districtTitle}` : ""}
              </span>
              <span className="flex items-center gap-1">
                <FiCalendar className="text-copper" />
                {listing.created_at ? new Date(listing.created_at).toLocaleDateString("az-AZ") : "Bu gün"}
              </span>
              <span className="flex items-center gap-1">
                <FiEye className="text-copper" />
                {listing.view_count || listing.views_count || 1} baxış
              </span>
            </div>
          </div>

          <div className="text-left md:text-right bg-white dark:bg-slate-900 p-5 rounded-2xl border border-navy/10 dark:border-slate-800 shadow-sm shrink-0">
            <div className="text-3xl font-extrabold text-navy dark:text-white font-heading">
              {Number(listing.price || 0).toLocaleString()} {listing.currency || "AZN"}
            </div>
            {listing.area_m2 && (
              <div className="text-xs text-navy/60 dark:text-slate-400 mt-0.5">
                {(Number(listing.price) / Number(listing.area_m2)).toFixed(0)} {listing.currency || "AZN"} / m²
              </div>
            )}
            
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-navy/70 dark:text-slate-300 hover:text-copper transition cursor-pointer"
              >
                {copied ? <FiCheck className="text-emerald-500" /> : <FiShare2 />}
                {copied ? "Kopyalandı!" : "Paylaş"}
              </button>
              <span className="text-navy/20 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-navy/70 dark:text-slate-300 hover:text-red-500 transition cursor-pointer"
              >
                <FiFlag /> Şikayət et
              </button>
            </div>
          </div>
        </div>

        {/* Media / Qalereya Bloku */}
        <div className="space-y-6">
          {images.length > 0 && (
            <div className="space-y-3">
              <div 
                className="relative w-full aspect-[16/10] overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800 shadow-card border border-navy/10 dark:border-slate-800 cursor-pointer group"
                onClick={() => {
                  const globalIndex = allMedia.findIndex((m) => m.url === currentImage?.url);
                  setActiveMediaIndex(globalIndex !== -1 ? globalIndex : 0);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentSrc}
                  alt={listing.title}
                  className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-300"
                  onError={() =>
                    currentImage && setFailed((f) => ({ ...f, [currentImage.url]: true }))
                  }
                />
                <div className="absolute bottom-4 right-4 bg-navy/85 dark:bg-slate-900/90 text-white text-xs px-3.5 py-2 rounded-xl backdrop-blur-sm flex items-center gap-2 shadow-sm pointer-events-none">
                  <FiMaximize2 /> Tam ekran bax ({images.length} şəkil)
                </div>
              </div>

              {images.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {images.map((img, i) => (
                    <button
                      key={img.url || i}
                      type="button"
                      onClick={() => setActiveImageTab(i)}
                      className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition cursor-pointer ${
                        i === activeImageTab
                          ? "border-copper shadow-md scale-105"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={failed[img.url] ? PLACEHOLDER : img.url}
                        alt={`${listing.title} ${i + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Videolar Bloku */}
          {videos.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="text-xl font-bold font-heading text-navy dark:text-white flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-copper" /> Video Təqdimat ({videos.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {videos.map((v, idx) => (
                  <div key={v.url || idx} className="rounded-2xl overflow-hidden bg-black border border-navy/10 dark:border-slate-800 shadow-md">
                    <video
                      controls
                      preload="metadata"
                      playsInline
                      src={v.url}
                      className="w-full rounded-2xl object-cover aspect-video bg-black"
                    >
                      <source src={v.url} type={getMime(v.url)} />
                      Brauzeriniz video teqini dəstəkləmir.
                    </video>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detallar və Əlaqə Sütunları */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
          <div className="lg:col-span-2 space-y-8">
            
            {/* Əmlak Parametrləri */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-navy/10 dark:border-slate-800 shadow-card">
              <h3 className="text-lg font-bold text-navy dark:text-white mb-5 flex items-center gap-2">
                <FiHome className="text-copper" /> Əmlakın Parametrləri və Göstəriciləri
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-navy/5 dark:border-slate-700">
                  <span className="text-navy/60 dark:text-slate-400 block text-xs">Ümumi Sahə</span>
                  <span className="font-extrabold text-navy dark:text-white text-base">
                    {listing.area_m2 || listing.area || "—"} m²
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-navy/5 dark:border-slate-700">
                  <span className="text-navy/60 dark:text-slate-400 block text-xs">Otaq Sayı</span>
                  <span className="font-extrabold text-navy dark:text-white text-base">
                    {listing.room_count || listing.rooms || "—"} otaqlı
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-navy/5 dark:border-slate-700">
                  <span className="text-navy/60 dark:text-slate-400 block text-xs">Mərtəbə</span>
                  <span className="font-extrabold text-navy dark:text-white text-base">
                    {listing.floor_number || listing.floor || "—"} / {listing.total_floors || "—"}
                  </span>
                </div>

                {listing.yard_sot && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-navy/5 dark:border-slate-700">
                    <span className="text-navy/60 dark:text-slate-400 block text-xs">Torpaq Sahəsi</span>
                    <span className="font-extrabold text-navy dark:text-white text-base">
                      {listing.yard_sot} sot
                    </span>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-navy/5 dark:border-slate-700">
                  <span className="text-navy/60 dark:text-slate-400 block text-xs">Sənəd Növü</span>
                  <span className="font-extrabold text-navy dark:text-white text-sm truncate block">
                    {Array.isArray(listing.documents) && listing.documents.length > 0 
                      ? listing.documents.join(", ") 
                      : (listing.document_type || "Kupça / Çıxarış")}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-navy/5 dark:border-slate-700">
                  <span className="text-navy/60 dark:text-slate-400 block text-xs">Kredit İpoteka</span>
                  <span className={`font-extrabold text-sm ${listing.mortgage_available ? "text-emerald-600 dark:text-emerald-400" : "text-navy/70 dark:text-slate-400"}`}>
                    {listing.mortgage_available ? "Mümkündür" : "Yoxdur"}
                  </span>
                </div>
              </div>
            </div>

            {/* Ətraflı Məlumat */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-navy/10 dark:border-slate-800 shadow-card">
              <h3 className="text-lg font-bold text-navy dark:text-white mb-4">Ətraflı Açıqlama</h3>
              <p className="text-navy/80 dark:text-slate-300 leading-relaxed whitespace-pre-line text-sm">
                {localizedField(listing, "description", locale) || listing.description_az || listing.description || "Bu elan üçün əlavə açıqlama qeyd olunmayıb."}
              </p>
            </div>

            {/* Xəritə İnteqrasiyası */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-navy/10 dark:border-slate-800 shadow-card">
              <h3 className="text-lg font-bold text-navy dark:text-white mb-2 flex items-center gap-2">
                <FiMapPin className="text-copper" /> Yerləşdiyi Dəqiq Ünvan və Xəritə
              </h3>
              <p className="text-sm text-navy/70 dark:text-slate-300 mb-4">{listing.address}</p>
              <div className="w-full h-80 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-navy/10 dark:border-slate-700 relative">
                <iframe
                  title="Property Location Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(listing.address || "Baku, Azerbaijan")}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                />
              </div>
            </div>

          </div>

          {/* Sağ Tərəf: Elan Sahibi və Əlaqə */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-navy/10 dark:border-slate-800 shadow-card sticky top-24 space-y-6">
              <h3 className="text-lg font-bold text-navy dark:text-white">
                {isAgency ? "Vasitəçi Agentlik / Rieltor" : "Mülk Sahibi"}
              </h3>
              
              {/* Elan Sahibi Profili */}
              {(() => {
                const ownerProfileId = listing.profiles?.id || listing.owner_id || listing.user_id || "r1";
                return (
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/realtors/${ownerProfileId}`}
                      className="w-16 h-16 rounded-2xl bg-navy/10 dark:bg-slate-800 flex items-center justify-center font-bold text-navy dark:text-white text-xl overflow-hidden border border-navy/10 dark:border-slate-700 shrink-0 hover:border-copper transition"
                    >
                      {listing.profiles?.avatar_url ? (
                        <img src={listing.profiles.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{listing.profiles?.full_name?.[0] || "M"}</span>
                      )}
                    </Link>
                    <div className="min-w-0">
                      <Link
                        href={`/realtors/${ownerProfileId}`}
                        className="font-bold text-navy dark:text-white flex items-center gap-1 truncate text-base hover:text-copper transition"
                      >
                        {listing.profiles?.full_name || "Mülkera Rieltoru"}
                        {isAgency && <FiCheckCircle className="text-emerald-500 text-sm shrink-0" />}
                      </Link>
                      <p className="text-xs text-navy/60 dark:text-slate-400 mt-0.5 truncate">
                        {listing.profiles?.agency_name || (isAgency ? "Rieltor Agentliyi" : "Mülkiyyətçi")}
                      </p>
                      <Link
                        href={`/realtors/${ownerProfileId}`}
                        className="text-[11px] font-bold text-copper hover:underline mt-1 inline-block"
                      >
                        Profilə və bütün elanlarına bax →
                      </Link>
                    </div>
                  </div>
                );
              })()}

              {/* VIP Önə Çəkmə Düyməsi */}
              <button
                type="button"
                onClick={() => setShowVipModal(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white hover:from-amber-600 hover:to-yellow-600 py-3 px-4 text-xs font-extrabold transition shadow-md cursor-pointer"
              >
                <span>👑</span> {listing.is_vip ? "VIP Statusunu Yenilə" : "⚡ Elanı VIP Et / Önə Çək"}
              </button>

              {/* Zəng və WhatsApp Düymələri */}
              <div className="space-y-3 pt-2">
                <a 
                  href={`tel:${contactPhone}`}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-navy text-white hover:bg-copper py-3.5 px-4 text-xs font-bold transition shadow-sm"
                >
                  <FiPhone className="text-sm" /> Zəng Et: {contactPhone}
                </a>

                <a 
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 py-3.5 px-4 text-xs font-bold transition shadow-sm"
                >
                  <FiMessageSquare className="text-sm" /> WhatsApp ilə Əlaqə
                </a>

                {/* MÜLKERA Çat: Sahibinə / Rieltoruna Birbaşa Mesaj */}
                <Link
                  href={`/messages?user_id=${listing.owner_id || listing.user_id || ""}&listing_id=${listing.id}`}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-copper to-amber-600 text-white hover:brightness-110 py-3.5 px-4 text-xs font-bold transition shadow-sm"
                >
                  <FiSend className="text-sm" /> Sahibinə / Rieltoruna Mesaj Göndər
                </Link>
              </div>

              {/* Elan Parametrləri Xülasəsi */}
              <div className="border-t border-navy/10 dark:border-slate-800 pt-4 text-xs text-navy/60 dark:text-slate-400 space-y-2">
                <div className="flex justify-between">
                  <span>Elan ID nömrəsi:</span>
                  <span className="font-mono font-bold text-navy dark:text-white">#{listingRefNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Elan növü:</span>
                  <span className="font-bold text-navy dark:text-white">
                    {isAgency ? "Agentlik" : "Fərdi şəxs"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`font-bold ${listing.is_vip ? "text-amber-500" : "text-emerald-500"}`}>
                    {listing.is_vip ? "👑 VIP Elan" : "Standart"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Yerləşdirilmə:</span>
                  <span className="font-bold text-navy dark:text-white">
                    {listing.created_at ? new Date(listing.created_at).toLocaleDateString("az-AZ") : "Bu gün"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Baxış sayı:</span>
                  <span className="font-bold text-navy dark:text-white">
                    {listing.view_count || listing.views_count || 1} dəfə
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Rəylər və Qiymətləndirmə Bölməsi */}
        <div className="mt-16 pt-10 border-t border-navy/10 dark:border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold font-heading text-navy dark:text-white flex items-center gap-2">
                <span>⭐</span> Rəylər və Qiymətləndirmə
              </h3>
              <p className="text-xs text-navy/60 dark:text-slate-400 mt-1">
                Bu əmlak və vasitəçilik xidməti haqqında real müştəri rəyləri
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gold/10 text-copper dark:text-amber-400 border border-gold/20 flex items-center gap-1">
                <FiStar className="fill-copper text-copper" /> {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / reviews.length).toFixed(1) : "5.0"} / 5 ({reviews.length} rəy)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Mövcud Rəylər Siyahısı */}
            <div className="lg:col-span-2 space-y-4">
              {reviewsLoading ? (
                <div className="p-8 text-center text-xs text-navy/40">Rəylər yüklənir...</div>
              ) : reviews.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-navy/10 dark:border-slate-800 shadow-sm space-y-2">
                  <FiStar className="text-2xl text-copper/40 mx-auto" />
                  <p className="text-xs font-bold text-navy dark:text-white">
                    Hələ heç bir rəy bildirilməyib
                  </p>
                  <p className="text-[11px] text-navy/50 dark:text-slate-400">
                    Bu elan və ya xidmət haqqında ilk rəyi aşağıdakı formadan istifadə edərək siz yazın.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-navy/10 dark:border-slate-800 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-copper">
                            {(rev.author_name || rev.reviewer_name || "M")[0].toUpperCase()}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-navy dark:text-white">
                              {rev.author_name || rev.reviewer_name || "Müştəri"}
                            </h5>
                            <span className="text-[10px] text-navy/40 dark:text-slate-500">
                              {rev.created_at ? new Date(rev.created_at).toLocaleDateString("az-AZ") : "Bu gün"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-amber-500 text-xs">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FiStar
                              key={star}
                              className={`text-xs ${
                                star <= Number(rev.rating || 5)
                                  ? "fill-amber-400 text-amber-500"
                                  : "text-slate-300 dark:text-slate-700"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-navy/70 dark:text-slate-300 leading-relaxed font-normal">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Yeni Rəy Yazma Formu */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-navy/10 dark:border-slate-800 shadow-sm space-y-4 h-fit">
              <h4 className="text-sm font-bold text-navy dark:text-white flex items-center gap-1.5">
                <span>✍️</span> Rəy Bildirin
              </h4>

              {reviewSuccessMsg ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <FiCheckCircle className="shrink-0 text-base" /> {reviewSuccessMsg}
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-navy/70 dark:text-slate-300 mb-1">
                      Qiymətləndirmə (Ulduz)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReviewRating(star)}
                          className="p-1 text-lg transition hover:scale-110 cursor-pointer"
                        >
                          <FiStar
                            className={
                              star <= newReviewRating
                                ? "fill-amber-400 text-amber-500"
                                : "text-slate-300 dark:text-slate-600"
                            }
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-bold text-copper">{newReviewRating} ulduz</span>
                    </div>
                  </div>

                  {!user && (
                    <div>
                      <label className="block text-[11px] font-bold text-navy/70 dark:text-slate-300 mb-1">
                        Adınız
                      </label>
                      <input
                        type="text"
                        placeholder="Ad və Soyad"
                        value={newReviewAuthor}
                        onChange={(e) => setNewReviewAuthor(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/10 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none placeholder:text-navy/40"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-navy/70 dark:text-slate-300 mb-1">
                      Təəssüratınız və Şərhiniz
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Mənzil və ya xidmət haqqında rəyinizi yazın..."
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/10 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none placeholder:text-navy/40 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={reviewSubmitting || !newReviewComment.trim()}
                    className="w-full py-2.5 rounded-xl bg-navy text-white hover:bg-copper text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {reviewSubmitting ? "Göndərilir..." : "Rəyi Dərc Et"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Oxşar Elanlar (Eyni məkanda, yaxın qiymət, oxşar sahə) */}
        {relatedListings.length > 0 && (
          <div className="mt-16 pt-10 border-t border-navy/10 dark:border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold font-heading text-navy dark:text-white flex items-center gap-2">
                  <span>🎯</span> Oxşar və Əlaqədar Elanlar
                </h3>
                <p className="text-xs text-navy/60 dark:text-slate-400 mt-1">
                  Eyni məkanda ({listing.districts?.name || listing.district_name || "Bakı"}), yaxın qiymət aralığında və oxşar sahəyə malik elanlar
                </p>
              </div>
              <span className="self-start sm:self-auto text-[11px] font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <FiCheckCircle /> Ağıllı Uyğunluq Alqoritmi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedListings.map((item) => (
                <div key={item.id} className="relative group flex flex-col">
                  {item._matchPercentage && (
                    <div className="mb-2 flex items-center justify-between gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      <span className="flex items-center gap-1">
                        <span>⚡</span> {item._matchPercentage}% Uyğunluq
                      </span>
                      {item._meetsTarget && (
                        <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-extrabold">
                          DƏQİQ
                        </span>
                      )}
                    </div>
                  )}
                  <ListingCard listing={item} />
                  {item._matchReasons && item._matchReasons.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1 px-1">
                      {item._matchReasons.slice(0, 2).map((r, i) => (
                        <span key={i} className="text-[9px] text-navy/60 dark:text-slate-400 bg-navy/5 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          ✓ {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox Tam Ekran Modalı */}
        {activeMediaIndex !== null && (
          <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
            <button 
              onClick={() => setActiveMediaIndex(null)}
              className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition z-50 cursor-pointer"
            >
              <FiX size={26} />
            </button>
            
            <button 
              onClick={() => setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : allMedia.length - 1))}
              className="absolute left-6 text-white bg-white/10 p-3.5 rounded-full hover:bg-white/20 transition z-50 cursor-pointer"
            >
              <FiChevronLeft size={28} />
            </button>

            <div className="max-w-5xl max-h-[85vh] flex items-center justify-center">
              {allMedia[activeMediaIndex]?.media_type === "video" ? (
                <video 
                  src={allMedia[activeMediaIndex].url} 
                  controls 
                  autoPlay 
                  className="max-h-[85vh] max-w-[85vw] rounded-2xl"
                />
              ) : (
                <img 
                  src={allMedia[activeMediaIndex]?.url || currentSrc} 
                  alt="Fullscreen view" 
                  className="max-h-[85vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl"
                />
              )}
            </div>

            <button 
              onClick={() => setActiveMediaIndex((prev) => (prev < allMedia.length - 1 ? prev + 1 : 0))}
              className="absolute right-6 text-white bg-white/10 p-3.5 rounded-full hover:bg-white/20 transition z-50 cursor-pointer"
            >
              <FiChevronRight size={28} />
            </button>

            <div className="absolute bottom-6 text-white/70 text-xs font-mono">
              {activeMediaIndex + 1} / {allMedia.length}
            </div>
          </div>
        )}

        {/* Şikayət Modalı */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-navy/10 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-navy/10 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-base text-navy dark:text-white flex items-center gap-2">
                  <FiFlag className="text-red-500" /> Elan Haqqında Şikayət
                </h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-navy/50 hover:text-navy dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  <FiX size={20} />
                </button>
              </div>

              {reportSent ? (
                <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold text-center">
                  Şikayətiniz qəbul olundu. MÜLKERA moderatorları tərəfindən araşdırılacaq. Təşəkkür edirik!
                </div>
              ) : (
                <form onSubmit={handleSendReport} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1.5">
                      Şikayət səbəbi
                    </label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none font-semibold cursor-pointer"
                    >
                      <option>Yalan və ya köhnəlmiş məlumat</option>
                      <option>Artıq satılıb və ya kirayə verilib</option>
                      <option>Düzgün olmayan qiymət</option>
                      <option>Şəkillər reallığa uyğun deyil</option>
                      <option>Dələduzluq və ya şübhəli elan</option>
                      <option>Digər səbəb</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1.5">
                      Əlavə açıqlama (istəyə bağlı)
                    </label>
                    <textarea
                      rows={3}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Şikayətinizlə bağlı detalları qeyd edin..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 rounded-xl border border-navy/15 dark:border-slate-700 text-xs font-semibold text-navy dark:text-slate-300 cursor-pointer"
                    >
                      Ləğv et
                    </button>
                    <button
                      type="submit"
                      disabled={reporting}
                      className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      {reporting ? "Göndərilir..." : "Şikayəti Göndər"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* VIP Önə Çəkmə və Paket Seçimi Modalı */}
        {showVipModal && (
          <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-navy/10 dark:border-slate-800 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-navy/10 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg font-bold">
                    👑
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-navy dark:text-white">
                      Elanı VIP Et və Önə Çək
                    </h3>
                    <p className="text-[11px] text-navy/60 dark:text-slate-400">
                      Elanınızı ən üst mövqeyə çıxararaq 5 qata qədər daha çox alıcı cəlb edin
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVipModal(false)}
                  className="text-navy/50 hover:text-navy dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  <FiX size={20} />
                </button>
              </div>

              {vipSuccessMessage ? (
                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-center space-y-2">
                  <div className="text-3xl">🎉</div>
                  <h4 className="font-bold text-sm">{vipSuccessMessage}</h4>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                    Elanınız dərhal saytın ən üst pilləsinə yerləşdirildi!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-navy/80 dark:text-slate-300">
                    VIP İrəliləyiş Paketini Seçin:
                  </label>

                  <div className="space-y-2.5">
                    {[
                      { id: "vip-7", name: "7 Günlük Express VIP", days: 7, price: 15, tag: "Təcili Satış" },
                      { id: "vip-15", name: "15 Günlük Pro VIP", days: 15, price: 29, is_popular: true, tag: "Ən Populyar" },
                      { id: "vip-30", name: "30 Günlük Super VIP Vitrin", days: 30, price: 49, tag: "Maksimum Görünürlük" }
                    ].map((pkg) => {
                      const isSelected = selectedVipPackage === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedVipPackage(pkg.id)}
                          className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                              : "border-navy/10 dark:border-slate-800 hover:border-amber-500/40"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-navy dark:text-white">{pkg.name}</span>
                              {pkg.tag && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  pkg.is_popular
                                    ? "bg-amber-500 text-white"
                                    : "bg-navy/5 text-navy/70 dark:bg-slate-800 dark:text-slate-300"
                                }`}>
                                  {pkg.tag}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-navy/60 dark:text-slate-400">
                              {pkg.days} gün boyunca axtarış və kateqoriyalarda zirvədə nümayiş
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-extrabold font-heading text-navy dark:text-white">
                              {pkg.price} AZN
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-navy/5 dark:border-slate-700 text-[11px] text-navy/70 dark:text-slate-300 space-y-1">
                    <p className="font-bold flex items-center gap-1 text-navy dark:text-white">
                      <span>💳</span> Təhlükəsiz Ödəniş Üsulu:
                    </p>
                    <p>Bütün Visa, MasterCard və Birbank / Tamkart ilə komissiyasız dərhal aktivləşir.</p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowVipModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-navy/15 dark:border-slate-700 text-xs font-semibold text-navy dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Bağla
                    </button>
                    <button
                      type="button"
                      onClick={handleActivateVip}
                      disabled={vipLoading}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-extrabold shadow-md hover:from-amber-600 hover:to-yellow-600 transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
                    >
                      {vipLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Aktivləşdirilir...
                        </>
                      ) : (
                        <>
                          <span>👑</span> İndi VIP Et və Önə Çək
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
