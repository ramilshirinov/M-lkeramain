"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";

export function useFavorite(listingId) {
  const { user } = useApp();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkFavorite() {
      if (!user || !listingId) {
        if (active) {
          setIsFavorited(false);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/listings/${listingId}/favorite?userId=${user.id}`);
        const json = await res.json();
        if (active) {
          setIsFavorited(!!json.favorited);
        }
      } catch (err) {
        console.error("Sevimlilər yoxlanılarkən xəta:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    checkFavorite();
    return () => {
      active = false;
    };
  }, [user, listingId]);

  const toggleFavorite = useCallback(async () => {
    if (!user) {
      return { requiresAuth: true };
    }
    if (!listingId || toggling) return {};

    const previous = isFavorited;
    setToggling(true);
    setIsFavorited(!previous); // Optimistic UI

    try {
      const res = await fetch(`/api/listings/${listingId}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Xəta baş verdi");
      }

      setIsFavorited(!!json.favorited);
      return { success: true, favorited: json.favorited };
    } catch (err) {
      console.error("Sevimlilərə əlavə/silmə xətası:", err);
      setIsFavorited(previous);
      return { error: err };
    } finally {
      setToggling(false);
    }
  }, [user, listingId, isFavorited, toggling]);

  return { isFavorited, loading, toggling, toggleFavorite };
}
