"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { getDictionary } from "@/lib/i18n";
import { createSmartClient } from "@/lib/supabaseAdapter";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("az");

  const dict = useMemo(() => getDictionary(language), [language]);

  // Auth dəyişikliyi zamanı state yeniləməsi
  const handleAuthChange = useCallback((newUser) => {
    setUser(newUser);
    setProfile(newUser);
  }, []);

  // Universal smart adapter
  const supabase = useMemo(() => createSmartClient(user, handleAuthChange), [user, handleAuthChange]);

  // Cari sessiyanı serverdən yoxla
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = await res.json();
      if (json.user) {
        setUser(json.user);
        setProfile(json.profile || json.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error("Auth yoxlanışı xətası:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Giriş funksiyası
  const login = async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Giriş uğursuz oldu");
    }
    setUser(json.user);
    setProfile(json.profile || json.user);
    return json;
  };

  // Bir kliklə demo giriş (Admin, Rieltor, Müştəri)
  const quickLogin = async (quickRole) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quickRole }),
    });
    const json = await res.json();
    if (json.success) {
      setUser(json.user);
      setProfile(json.profile || json.user);
    }
    return json;
  };

  // Qeydiyyat funksiyası
  const register = async (formData) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Qeydiyyat uğursuz oldu");
    }
    setUser(json.user);
    setProfile(json.profile || json.user);
    return json;
  };

  // Çıxış funksiyası
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setProfile(null);
  };

  // Profil yeniləmə
  const updateProfile = async (data) => {
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, ...data }),
    });
    const json = await res.json();
    if (json.success) {
      setUser(json.user);
      setProfile(json.profile || json.user);
    }
    return json;
  };

  const value = {
    supabase,
    user,
    profile: profile || user,
    loading,
    loadingAuth: loading,
    language,
    locale: language,
    setLanguage,
    dict,
    t: dict,
    login,
    quickLogin,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
