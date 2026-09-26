"use client";

import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import Link from "next/link";
import { FiHeart, FiMapPin, FiHome, FiEye, FiTrash2 } from "react-icons/fi";

const PLACEHOLDER = "/images/placeholder-property.svg";

function extractListingPhoto(listing) {
  if (!listing) return PLACEHOLDER;
  if (Array.isArray(listing.listing_photos) && listing.listing_photos.length > 0) {
    const found = listing.listing_photos.find((p) => {
      const u = typeof p === "string" ? p : p?.url;
      const type = typeof p === "object" ? p?.media_type : null;
      return !!u && type !== "video" && !u.match(/\.(mp4|webm|mov)$/i);
    });
    if (found) return typeof found === "string" ? found : found.url;
  }
  if (Array.isArray(listing.photos) && listing.photos.length > 0) {
    const first = listing.photos[0];
    return typeof first === "string" ? first : first?.url || PLACEHOLDER;
  }
  if (Array.isArray(listing.images) && listing.images.length > 0) {
    const first = listing.images[0];
    return typeof first === "string" ? first : first?.url || PLACEHOLDER;
  }
  return listing.image_url || listing.cover_image || listing.photo_url || PLACEHOLDER;
}

export default function FavoritesPage() {
  const { user, supabase } = useApp();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);

    try {
      // 1. Əgər istifadəçi daxil olubsa, Supabase-dən çəkirik
      if (user?.id && supabase) {
        const { data, error } = await supabase
          .from("favorites")
          .select("id, listing_id, listings(*, listing_photos(*), categories(*), districts(*))")
          .eq("user_id", user.id);

        if (!error && Array.isArray(data)) {
          const formatted = data.map((item) => item.listings).filter(Boolean);
          setFavorites(formatted);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback: LocalStorage-dən saxlanılan favorit ID-ləri
      let localIds = [];
      try {
        const raw = localStorage.getItem("mulkera_favorites");
        localIds = raw ? JSON.parse(raw) : [];
      } catch (e) {}

      if (localIds.length > 0 && supabase) {
        const { data, error } = await supabase
          .from("listings")
          .select("*, listing_photos(*), categories(*), districts(*)")
          .in("id", localIds);

        if (!error && Array.isArray(data)) {
          setFavorites(data);
          setLoading(false);
          return;
        }
      }

      setFavorites([]);
    } catch (err) {
      console.error("Favoritlər yüklənmədi:", err);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  useEffect(() => {
    fetchFavorites();

    const onUpdate = () => fetchFavorites();
    if (typeof window !== "undefined") {
      window.addEventListener("mulkera_favorites_updated", onUpdate);
      return () => window.removeEventListener("mulkera_favorites_updated", onUpdate);
    }
  }, [fetchFavorites]);

  const removeFavorite = async (listingId) => {
    // 1. LocalStorage-dən çıxarırıq
    try {
      const raw = localStorage.getItem("mulkera_favorites");
      const localIds = raw ? JSON.parse(raw) : [];
      const updated = localIds.filter((id) => id !== String(listingId));
      localStorage.setItem("mulkera_favorites", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("mulkera_favorites_updated", { detail: updated }));
    } catch (e) {}

    // 2. Supabase-dən silirik
    if (user?.id && supabase) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);
    }

    setFavorites((prev) => prev.filter((item) => item.id !== listingId));
  };

  if (loading) {
    return (
      <div className="py-32 text-center text-navy dark:text-slate-200 font-medium">
        Favoritlər yüklənir...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-copper/10 text-copper uppercase tracking-wider">
          Saxlanılanlar
        </span>
        <h1 className="text-3xl font-extrabold font-heading text-navy dark:text-slate-100 mt-2">
          Seçilmiş Elanlarım
        </h1>
        <p className="text-navy/70 dark:text-slate-400 text-sm mt-1">
          Bəyəndiyiniz və yadda saxladığınız daşınmaz əmlak elanları.
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-navy/10 dark:border-slate-800 shadow-card">
          <FiHeart className="mx-auto text-4xl text-navy/30 dark:text-slate-600 mb-3" />
          <p className="text-navy/70 dark:text-slate-400 text-base mb-4">
            Hələ heç bir elan yadda saxlamamısınız.
          </p>
          <Link
            href="/listings"
            className="inline-block px-6 py-3 bg-navy text-white rounded-xl font-bold text-sm hover:bg-copper transition shadow-md"
          >
            Elanlara Bax
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((listing) => {
            const photoUrl = extractListingPhoto(listing);
            return (
              <div
                key={listing.id}
                className="card-surface bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 overflow-hidden flex flex-col justify-between relative group"
              >
                <button
                  type="button"
                  onClick={() => removeFavorite(listing.id)}
                  className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex items-center justify-center text-rose-600 hover:bg-rose-50 transition shadow-sm cursor-pointer"
                  title="Favoritlərdən sil"
                >
                  <FiTrash2 className="text-sm" />
                </button>

                <div>
                  <div className="relative h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt={listing.title || "Əmlak"}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER;
                      }}
                    />
                    <span className="absolute top-3 left-3 bg-navy/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                      {listing.transaction_type === "sale" ? "Satış" : "Kirayə"}
                    </span>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-copper uppercase tracking-wider">
                        {listing.categories?.name || listing.category || "Mənzil"}
                      </span>
                      <span className="text-lg font-extrabold text-navy dark:text-slate-100">
                        {Number(listing.price).toLocaleString()} {listing.currency || "AZN"}
                      </span>
                    </div>

                    <Link href={`/listings/${listing.id}`}>
                      <h3 className="font-bold text-base text-navy dark:text-slate-100 line-clamp-1 hover:text-copper transition">
                        {listing.title}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-1.5 text-xs text-navy/60 dark:text-slate-400">
                      <FiMapPin className="text-copper shrink-0" />
                      <span className="truncate">
                        {listing.address || listing.districts?.name || "Məkan qeyd olunmayıb"}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-navy/10 dark:border-slate-800 flex items-center justify-between text-xs text-navy/70 dark:text-slate-400">
                      <span>{listing.rooms ? `${listing.rooms} otaqlı` : "—"}</span>
                      <span>{listing.area_m2 ? `${listing.area_m2} m²` : "—"}</span>
                      <span>
                        {listing.floor ? `${listing.floor}/${listing.total_floors || "—"} mərtəbə` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-copper hover:text-white dark:hover:bg-copper text-navy dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <FiEye /> Detallı Bax
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}