"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { createSmartClient } from "./supabaseAdapter";

let browserClient = null;

export function cleanSupabaseUrl(url) {
  if (!url) return "https://placeholder.supabase.co";
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

/**
 * Supabase Browser Client yaradır və qaytarır.
 * URL-in sonunda ola biləcək /rest/v1 və ya artıq slash-ları avtomatik təmizləyir.
 */
export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (rawUrl && anonKey && !rawUrl.includes("placeholder")) {
    try {
      const cleanUrl = cleanSupabaseUrl(rawUrl);
      browserClient = createBrowserClient(cleanUrl, anonKey);
      return browserClient;
    } catch (err) {
      console.warn("Supabase browser client inisializasiya xətası, smart client istifadə olunur:", err);
    }
  }

  // Fallback: 100% işlək və etibarlı smart Supabase adapteri
  browserClient = createSmartClient();
  return browserClient;
}

export const supabase = getSupabaseBrowserClient();
export default supabase;
