"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { getDictionary } from "@/lib/i18n";

const Ctx = createContext(null);

const PROFILE_FIELDS = [
  "full_name",
  "phone",
  "avatar_url",
  "agency_name",
  "agency_address",
  "commission_rate",
  "legal_status",
  "service_areas",
  "specialties",
  "facebook_url",
  "instagram_url",
  "tiktok_url",
  "youtube_url",
  "whatsapp",
  "telegram_handle",
  "custom_contacts",
  "bio",
  "email_notifications",
  "sms_notifications",
];

export function AppProvider({ children, initialLanguage = "az" }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState(initialLanguage || "az");

  const loadProfile = useCallback(
    async (uid) => {
      if (!uid) {
        setProfile(null);
        return;
      }
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
        if (error) console.error("profile load:", error);
        setProfile(data ?? null);
      } catch (err) {
        console.error("profile fetch error:", err);
        setProfile(null);
      }
    },
    [supabase]
  );

  useEffect(() => {
    let alive = true;
    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (!alive) return;
        setUser(data.user ?? null);
        await loadProfile(data.user?.id);
        if (alive) setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
      loadProfile(session?.user?.id);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase, loadProfile]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("mulkera_lang") : null;
    if (["az", "ru", "en"].includes(saved)) {
      setLanguageState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const setLanguage = useCallback((l) => {
    if (!["az", "ru", "en"].includes(l)) return;
    setLanguageState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("mulkera_lang", l);
      document.cookie = `mulkera_lang=${l}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = l;
    }
  }, []);

  const login = async (email, password) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    setUser(data.user ?? null);
    await loadProfile(data.user?.id);
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Yalnız profile state-ini dəyişir. user-ə TOXUNMUR -> /login-ə atılma aradan qalxır
  const updateProfile = async (patch) => {
    if (!user) throw new Error("unauthorized");
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([k]) => PROFILE_FIELDS.includes(k))
    );
    clean.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("profiles")
      .update(clean)
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    setProfile(data);
    return data;
  };

  const dict = useMemo(() => getDictionary(language), [language]);

  const value = {
    supabase,
    user,
    profile,
    loading,
    loadingAuth: loading,
    language,
    locale: language,
    setLanguage,
    dict,
    t: dict,
    login,
    logout,
    updateProfile,
    refreshProfile: () => loadProfile(user?.id),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
