"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    async function fetchFavorites() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      // listings ilə yanaşı listing_photos, categories və districts də çəkilir
      const { data, error } = await supabase
        .from("favorites")
        .select("id, listing_id, listings(*, listing_photos(*), categories(*), districts(*))")
        .eq("user_id", user.id);

      if (!error && data) {
        // Formatlaşdırma
        const formatted = data.map(item => item.listings).filter(Boolean);
        setFavorites(formatted);
      }
      setLoading(false);
    }

    fetchFavorites();
  }, [user, supabase]);

  const removeFavorite = async (listingId) => {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);

    if (!error) {
      setFavorites(favorites.filter(item => item.id !== listingId));
    } else {
      alert("Silinərkən xəta baş verdi.");
    }
  };

  if (loading) {
    return <div className="py-32 text-center text-navy dark:text-slate-200 font-medium">Favoritlər yüklənir...</div>;
  }

  if (!user) {
    return (
      <div className="py-32 text-center max-w-md mx-auto px-4">
        <FiHeart className="mx-auto text-5xl text-copper mb-4" />
        <h2 className="text-2xl font-bold text-navy dark:text-slate-100 mb-2">Giriş Edilməyib</h2>
        <p className="text-navy/70 dark:text-slate-400 text-sm mb-6">Favoritlərinizi görmək üçün sistemə daxil olun.</p>
        <Link href="/login" className="inline-block px-6 py-3 bg-navy text-white rounded-xl font-bold text-sm hover:bg-copper transition">
          Daxil Ol
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-copper/10 text-copper uppercase tracking-wider">
          Saxlanılanlar
        </span>
        <h1 className="text-3xl font-extrabold font-heading text-navy dark:text-slate-100 mt-2">Seçilmiş Elanlarım</h1>
        <p className="text-navy/70 dark:text-slate-400 text-sm mt-1">Bəyəndiyiniz və yadda saxladığınız daşınmaz əmlak elanları.</p>
      </div>

      {favorites.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-navy/10 dark:border-slate-800 shadow-card">
          <FiHeart className="mx-auto text-4xl text-navy/30 dark:text-slate-600 mb-3" />
          <p className="text-navy/70 dark:text-slate-400 text-base mb-4">Hələ heç bir elan yadda saxlamamısınız.</p>
          <Link href="/listings" className="inline-block px-6 py-3 bg-navy text-white rounded-xl font-bold text-sm hover:bg-copper transition">
            Elanlara Bax
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((listing) => {
            const photoUrl = extractListingPhoto(listing);
            return (
              <div key={listing.id} className="card-surface bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-navy/10 dark:border-slate-800 overflow-hidden flex flex-col justify-between relative group">
                <button 
                  onClick={() => removeFavorite(listing.id)}
                  className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm flex items-center justify-center text-rose-600 hover:bg-rose-50 transition shadow-sm"
                  title="Favoritlərdən sil"
                >
                  <FiTrash2 className="text-sm" />
                </button>

                <div>
                  <div className="relative h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
                      <span className="text-xs font-semibold text-copper uppercase tracking-wider">
                        {listing.categories?.name_az || listing.property_type || "Əmlak"}
                      </span>
                      <span className="text-xl font-extrabold font-heading text-navy dark:text-slate-100">
                        {Number(listing.price || 0).toLocaleString()} {listing.currency || "AZN"}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-navy dark:text-slate-100 line-clamp-1">{listing.title_az || listing.title}</h3>

                    <p className="text-xs text-navy/60 dark:text-slate-400 flex items-center gap-1.5">
                      <FiMapPin className="text-copper shrink-0" />
                      <span className="truncate">{listing.address || listing.location}</span>
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-navy text-white hover:bg-copper py-2.5 px-4 text-xs font-semibold transition shadow-sm"
                  >
                    <FiEye /> Ətraflı Bax
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