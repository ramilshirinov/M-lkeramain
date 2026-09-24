"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { createSmartClient } from "./supabaseAdapter";

let browserClient = null;

export function cleanSupabaseUrl(url) {
  if (!url || typeof url !== "string") return "";
  let cleaned = url.trim();

  // Handle markdown links e.g. [https://xyz.supabase.co](https://xyz.supabase.co)
  const mdMatch = cleaned.match(/\]\((https?:\/\/[^\s\)]+)\)/i);
  if (mdMatch) {
    cleaned = mdMatch[1];
  } else {
    const urlMatch = cleaned.match(/https?:\/\/[^\s\]\)\'\"\,>]+/i);
    if (urlMatch) {
      cleaned = urlMatch[0];
    }
  }

  cleaned = cleaned.replace(/^['"\[\(<]+|['"\]\)>]+$/g, "").trim();
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.origin;
    }
  } catch (e) {
    return "";
  }
  return "";
}

export function cleanSupabaseKey(key) {
  if (!key || typeof key !== "string") return "";
  return key.trim().replace(/^['"\[\(<]+|['"\]\)>]+$/g, "").trim();
}

/**
 * Supabase Browser Client yaradır və qaytarır.
 * URL və Açarları təmizləyir, səhv və ya boş olarsa xətasız Smart Client-ə keçir.
 */
export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cleanUrl = cleanSupabaseUrl(rawUrl);
  const cleanKey = cleanSupabaseKey(rawKey);

  if (cleanUrl && cleanKey && !cleanUrl.includes("placeholder")) {
    try {
      browserClient = createBrowserClient(cleanUrl, cleanKey);
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

