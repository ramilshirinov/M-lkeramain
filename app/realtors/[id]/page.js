"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import ListingCard from "@/components/ListingCard";
import {
  FiPhone,
  FiMail,
  FiMapPin,
  FiStar,
  FiCheckCircle,
  FiAward,
  FiShield,
  FiPercent,
  FiMessageSquare,
  FiTrendingUp,
  FiClock,
  FiArrowLeft,
  FiSend,
} from "react-icons/fi";

export default function RealtorProfilePage() {
  const { id } = useParams();
  const { supabase, user } = useApp();

  const [realtor, setRealtor] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Yeni rəy forması
  const [newRating, setNewRating] = useState(5);
  const [newAuthor, setNewAuthor] = useState("");
  const [newComment, setNewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    async function loadRealtorData() {
      if (!id) return;
      setLoading(true);

      try {
        // 1. Backend API-dən rieltor və elanları çəkirik
        const res = await fetch(`/api/realtors/${id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.realtor) {
            setRealtor(json.data.realtor);
            setListings(json.data.listings || []);
          }
        }

        // Rəyləri çəkirik
        const revRes = await fetch(`/api/reviews?realtor_id=${id}`);
        const revJson = await revRes.json();
        if (revJson.success && Array.isArray(revJson.reviews)) {
          setReviews(revJson.reviews);
        }
      } catch (err) {
        console.error("Məlumat yüklənmədi:", err);
      } finally {
        setLoading(false);
      }
    }

    loadRealtorData();
  }, [id, supabase]);

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const reviewer_name = newAuthor.trim() || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Anonim Müştəri";
    const reviewObj = {
      id: Date.now(),
      author_name: reviewer_name,
      rating: newRating,
      date: "İndicə",
      comment: newComment.trim(),
    };

    setReviews([reviewObj, ...reviews]);
    setNewAuthor("");
    setNewComment("");
    setReviewSubmitted(true);

    try {
      await fetch(`/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          realtor_id: id,
          reviewer_name,
          rating: newRating,
          comment: reviewObj.comment,
          user_id: user?.id || null,
        }),
      });
    } catch (err) {
      console.error("Rəy saxlanılarkən xəta:", err);
    }

    setTimeout(() => setReviewSubmitted(false), 3000);
  };

  const avgRating = (
    reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)
  ).toFixed(1);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-copper border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!realtor) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-[#F8FAFC] dark:bg-slate-950 text-center">
        <h2 className="text-xl font-bold text-navy dark:text-white mb-2">Rieltor tapılmadı</h2>
        <Link href="/realtors" className="text-copper font-bold underline text-sm">
          Bütün rieltorlar siyahısına qayıt
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-navy dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Geri qayıtma linki */}
        <Link
          href="/realtors"
          className="inline-flex items-center gap-2 text-xs font-bold text-navy/70 dark:text-slate-400 hover:text-copper transition"
        >
          <FiArrowLeft /> Top Rieltorlar siyahısına qayıt
        </Link>

        {/* Profil Kartı (Hero Section) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-navy/10 dark:border-slate-800 shadow-card relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-navy/10 dark:bg-slate-800 flex items-center justify-center text-3xl font-extrabold text-navy dark:text-white border-2 border-copper/30 shadow-md shrink-0 overflow-hidden">
                {realtor.avatar_url ? (
                  <img
                    src={realtor.avatar_url}
                    alt={realtor.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{realtor.full_name?.[0] || "R"}</span>
                )}
              </div>

              {/* Məlumatlar */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-navy dark:text-white">
                    {realtor.full_name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    <FiCheckCircle /> Təsdiqlənmiş Rieltor
                  </span>
                </div>

                <p className="text-sm font-semibold text-navy/70 dark:text-slate-300 flex items-center gap-1.5">
                  <FiMapPin className="text-copper" /> {realtor.agency_name}
                </p>

                <p className="text-xs text-navy/60 dark:text-slate-400 max-w-xl line-clamp-2">
                  {realtor.bio}
                </p>

                {/* Reytinq və rəy sayı */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-1 text-amber-500 font-extrabold text-sm">
                    <FiStar className="fill-amber-500" />
                    <span>{avgRating}</span>
                  </div>
                  <span className="text-xs text-navy/50 dark:text-slate-400">
                    ({reviews.length} müştəri rəyi)
                  </span>
                </div>
              </div>
            </div>

          {/* Əlaqə düymələri */}
          <div className="flex flex-col w-full md:w-auto gap-2.5 shrink-0">
            <Link
              href={`/messages?user_id=${realtor.id}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-copper to-amber-600 text-white hover:brightness-110 font-bold text-xs shadow-sm transition"
            >
              <FiSend /> Birbaşa Mesajlaş
            </Link>
            <a
              href={`tel:${realtor.phone}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-navy text-white hover:bg-copper font-bold text-xs shadow-sm transition"
            >
              <FiPhone /> {realtor.phone}
            </a>
            <a
              href={`https://wa.me/${realtor.phone?.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-sm transition"
            >
              <FiMessageSquare /> WhatsApp ilə Yaz
            </a>
          </div>
          </div>

          {/* Statistika və Şərtlər Zolağı */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-navy/10 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-navy/5 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-navy/50 dark:text-slate-400 block flex items-center gap-1">
                <FiPercent className="text-copper" /> Xidmət haqqı:
              </span>
              <span className="text-sm font-extrabold text-copper">{realtor.commission_rate}</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-navy/5 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-navy/50 dark:text-slate-400 block flex items-center gap-1">
                <FiShield className="text-emerald-500" /> Hüquqi Status:
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Qanuni VÖEN təsdiqli
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-navy/5 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-navy/50 dark:text-slate-400 block flex items-center gap-1">
                <FiTrendingUp className="text-copper" /> Tamamlanmış Satış:
              </span>
              <span className="text-sm font-extrabold text-navy dark:text-white">
                {realtor.sales_count} əmlak
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-navy/5 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-navy/50 dark:text-slate-400 block flex items-center gap-1">
                <FiClock className="text-copper" /> Satış Sürəti:
              </span>
              <span className="text-sm font-extrabold text-navy dark:text-white">
                orta {realtor.sales_speed_days} gün
              </span>
            </div>
          </div>
        </div>

        {/* Rieltorun Elanları Bölməsi */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold font-heading text-navy dark:text-white">
              Rieltorun Aktiv Elanları ({listings.length})
            </h2>
            <span className="text-xs text-navy/50 dark:text-slate-400">
              Bütün elanlar yoxlanılıb
            </span>
          </div>

          {listings.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-navy/10 dark:border-slate-800">
              <p className="text-sm text-navy/60 dark:text-slate-400">
                Bu rieltora aid hazırda aktiv elan tapılmadı.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((item) => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          )}
        </div>

        {/* Rəylər və Qiymətləndirmə Bölməsi */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-navy/10 dark:border-slate-800 shadow-card space-y-6">
          <div className="flex items-center justify-between border-b border-navy/10 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-navy dark:text-white">
                Müştəri Rəyləri və Qiymətləndirmə
              </h3>
              <p className="text-xs text-navy/60 dark:text-slate-400 mt-0.5">
                Real alıcı və satıcıların rieltor haqqında təcrübələri
              </p>
            </div>
            <div className="flex items-center gap-2 bg-amber-500/10 px-3.5 py-1.5 rounded-xl">
              <FiStar className="fill-amber-500 text-amber-500" />
              <span className="font-extrabold text-navy dark:text-white text-sm">{avgRating} / 5</span>
            </div>
          </div>

          {/* Yeni Rəy Yazmaq Formu */}
          <form onSubmit={handleAddReview} className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-navy/10 dark:border-slate-700 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-copper">
              Rieltor haqqında rəy bildir
            </h4>

            {reviewSubmitted && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                Təşəkkür edirik! Rəyiniz uğurla əlavə olundu.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1">
                  Adınız və Soyadınız
                </label>
                <input
                  type="text"
                  placeholder="Məsələn: Orxan Əliyev"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none focus:border-copper"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1">
                  Ulduz Qiymətləndirməsi
                </label>
                <div className="flex items-center gap-2 py-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="cursor-pointer"
                    >
                      <FiStar
                        className={`text-xl transition ${
                          star <= newRating
                            ? "fill-amber-500 text-amber-500"
                            : "text-slate-300 dark:text-slate-600"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-navy/70 dark:text-slate-300 ml-2">
                    {newRating} / 5
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy/70 dark:text-slate-300 mb-1">
                Şərhiniz
              </label>
              <textarea
                rows={3}
                placeholder="Rieltorun xidmət səviyyəsi, operativliyi və davranışı haqqında fikirlərinizi yazın..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-navy/15 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none focus:border-copper resize-none"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy text-white hover:bg-copper text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <FiSend /> Rəyi Göndər
            </button>
          </form>

          {/* Rəylərin Siyahısı */}
          <div className="space-y-4">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-navy/5 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-navy dark:text-white">
                      {r.author_name}
                    </span>
                    <span className="text-[10px] text-navy/40 dark:text-slate-500">· {r.date}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-500 text-xs">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <FiStar
                        key={i}
                        className={`text-xs ${i < r.rating ? "fill-amber-500" : "text-slate-300 dark:text-slate-600"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-navy/70 dark:text-slate-300 leading-relaxed">
                  {r.comment}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
