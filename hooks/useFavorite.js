"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";

function getLocalFavorites() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("mulkera_favorites");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalFavorites(ids) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("mulkera_favorites", JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent("mulkera_favorites_updated", { detail: ids }));
  } catch (e) {}
}

export function useFavorite(listingId) {
  const { user } = useApp();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Statusu yoxlayırıq
  const checkStatus = useCallback(async () => {
    if (!listingId) {
      setIsFavorited(false);
      setLoading(false);
      return;
    }

    if (user?.id) {
      try {
        const res = await fetch(`/api/listings/${listingId}/favorite?userId=${user.id}`);
        const json = await res.json();
        setIsFavorited(!!json.favorited);
      } catch (err) {
        // Fallback: local
        const local = getLocalFavorites();
        setIsFavorited(local.includes(String(listingId)));
      }
    } else {
      // İstifadəçi daxil olmayıbsa: local yaddaş
      const local = getLocalFavorites();
      setIsFavorited(local.includes(String(listingId)));
    }
    setLoading(false);
  }, [user?.id, listingId]);

  useEffect(() => {
    checkStatus();

    const onUpdate = () => checkStatus();
    if (typeof window !== "undefined") {
      window.addEventListener("mulkera_favorites_updated", onUpdate);
      return () => window.removeEventListener("mulkera_favorites_updated", onUpdate);
    }
  }, [checkStatus]);

  const toggleFavorite = useCallback(
    async (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!listingId || toggling) return;

      const previous = isFavorited;
      const nextState = !previous;
      setToggling(true);
      setIsFavorited(nextState); // Optimistic UI

      // Local storage yeniləyirik
      const local = getLocalFavorites();
      let newLocal = [];
      if (nextState) {
        newLocal = Array.from(new Set([...local, String(listingId)]));
      } else {
        newLocal = local.filter((id) => id !== String(listingId));
      }
      setLocalFavorites(newLocal);

      // Əgər istifadəçi daxil olubsa, birbaşa Supabase/API ilə sinxron edirik
      if (user?.id) {
        try {
          const res = await fetch(`/api/listings/${listingId}/favorite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id }),
          });
          const json = await res.json();
          if (json.success) {
            setIsFavorited(!!json.favorited);
            return { success: true, favorited: json.favorited };
          }
        } catch (err) {
          console.warn("Supabase favorite sync error:", err);
        }
      }

      setToggling(false);
      return { success: true, favorited: nextState };
    },
    [user?.id, listingId, isFavorited, toggling]
  );

  return { isFavorited, loading, toggling, toggleFavorite };
}
