"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import ListingCard from "@/components/ListingCard";
import { FiEdit2, FiTrash2, FiPlusCircle } from "react-icons/fi";

const SELECT = "*, listing_photos(url, media_type), categories(*), districts(*)";

export default function MyListings() {
  const { supabase, user } = useApp();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    if (!supabase || !user?.id) return;
    setLoading(true);
    // single() və limit() YOXDUR → istifadəçinin bütün elanları gəlir
    const { data, error: err } = await supabase
      .from("listings")
      .select(SELECT)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (err) {
      console.error("Elanlarım yüklənmədi:", err.message);
      setError("Elanları yükləmək mümkün olmadı.");
      setListings([]);
    } else {
      setError("");
      setListings(data || []);
    }
    setLoading(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Bu elanı silmək istədiyinizə əminsiniz?")) return;
    setDeletingId(id);
    const { error: err } = await supabase
      .from("listings")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id);

    if (err) {
      console.error("Silinmə xətası:", err.message);
      setError("Elanı silmək mümkün olmadı.");
    } else {
      setListings((prev) => prev.filter((l) => l.id !== id));
    }
    setDeletingId(null);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-heading text-navy dark:text-white">
          Mənim elanlarım{" "}
          {!loading && (
            <span className="text-base font-semibold text-navy/50 dark:text-slate-400">
              ({listings.length})
            </span>
          )}
        </h2>
        <Link
          href="/listings/add"
          className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper transition"
        >
          <FiPlusCircle /> Elan yerləşdir
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-navy/10 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center font-medium text-navy/55 dark:text-slate-400">
          Hələ ki heç bir elanınız yoxdur.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const editHref = `/listings/${listing.id}/edit`;
            return (
              <div key={listing.id} className="space-y-2">
                <ListingCard listing={listing} />
                <div className="flex gap-2">
                  <Link
                    href={editHref}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-navy/15 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 text-sm font-semibold text-navy dark:text-slate-100 transition hover:border-copper hover:text-copper"
                  >
                    <FiEdit2 /> Redaktə
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(listing.id)}
                    disabled={deletingId === listing.id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 py-2 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
                  >
                    <FiTrash2 /> {deletingId === listing.id ? "Silinir..." : "Sil"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}