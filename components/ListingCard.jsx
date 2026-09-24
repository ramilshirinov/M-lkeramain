"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { localizedField } from "@/lib/listings";
import { FiMapPin, FiHome } from "react-icons/fi";

const PLACEHOLDER = "/images/placeholder-property.svg";

export default function ListingCard({ listing }) {
  const { locale, language } = useApp();
  const currentLocale = locale || language || "az";
  const [imgError, setImgError] = useState(false);

  // Şəklin etibarlı təyini: listing_photos, photos, images, image_url və s. yoxlanılır
  const rawPhoto = (() => {
    if (!listing) return "";
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
      return typeof first === "string" ? first : first?.url || "";
    }
    if (Array.isArray(listing.images) && listing.images.length > 0) {
      const first = listing.images[0];
      return typeof first === "string" ? first : first?.url || "";
    }
    return listing.image_url || listing.cover_image || listing.photo_url || "";
  })();
  
  // Əgər şəkil yoxdursa və ya xəta baş veribsə placeholder göstəriləcək
  const mainPhoto = imgError || !rawPhoto ? PLACEHOLDER : rawPhoto;

  // Çoxdilli başlıq, kateqoriya və rayon
  const title = localizedField(listing, "title", currentLocale);
  const categoryName = listing.categories 
    ? localizedField(listing.categories, "name", currentLocale) 
    : (listing.category || "Əmlak");
  const districtName = listing.districts 
    ? localizedField(listing.districts, "name", currentLocale) 
    : "";

  const isSale = listing.transaction_type === "sale";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card-surface bg-white dark:bg-slate-900 rounded-2xl overflow-hidden group block transition hover:shadow-lg border border-navy/10 dark:border-slate-700 flex flex-col justify-between"
    >
      <div>
        {/* Şəkil və nişanlar */}
        <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {mainPhoto === PLACEHOLDER && !rawPhoto ? (
            <div className="w-full h-full flex items-center justify-center text-navy/25 dark:text-slate-600">
              <FiHome size={32} />
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mainPhoto}
              alt={title || "Əmlak"}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-300"
              onError={() => setImgError(true)}
            />
          )}

          {/* VIP badge */}
          {listing.is_vip && (
            <span className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
              <span>👑</span> VIP
            </span>
          )}

          {/* Oxşarlıq faizi nişanı (əgər oxşar elanlar bölməsindədirsə) */}
          {listing._matchPercentage && (
            <span className="absolute bottom-3 left-3 bg-emerald-600/95 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-sm flex items-center gap-1">
              <span>🎯</span> {listing._matchPercentage}% Oxşarlıq
            </span>
          )}

          {/* Əməliyyat növü (Satış / Kirayə) */}
          <span className="absolute top-3 left-3 bg-navy/80 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1 rounded-full">
            {isSale ? "Satış" : "Kirayə"}
          </span>
        </div>

        {/* Məlumat hissəsi */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-copper uppercase tracking-wider truncate">
              {categoryName}
            </span>
            <span className="text-xl font-extrabold font-heading text-navy dark:text-slate-100 whitespace-nowrap">
              {Number(listing.price || 0).toLocaleString()} {listing.currency || "AZN"}
            </span>
          </div>

          <h3 className="text-base font-bold text-navy dark:text-slate-100 truncate group-hover:text-copper transition">
            {title}
          </h3>

          <p className="text-xs text-navy/60 dark:text-slate-400 flex items-center gap-1.5 truncate">
            <FiMapPin className="text-copper shrink-0" />
            <span className="truncate">{listing.address} {districtName ? `· ${districtName}` : ""}</span>
          </p>

          {/* Oxşarlıq səbəbləri */}
          {Array.isArray(listing._matchReasons) && listing._matchReasons.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {listing._matchReasons.map((r, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium">
                  ✓ {r}
                </span>
              ))}
            </div>
          )}

          {/* Otaq və sahə məlumatları */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-navy/5 dark:border-slate-700 text-center text-xs text-navy/80 dark:text-slate-300">
            <div><span className="font-bold">{listing.room_count || 1}</span> otaq</div>
            <div><span className="font-bold">{listing.area_m2 || 0}</span> m²</div>
            <div><span className="font-bold">{listing.floor_number || 1}</span>/{listing.total_floors || 1} mərtəbə</div>
          </div>
        </div>
      </div>
    </Link>
  );
}