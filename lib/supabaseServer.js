import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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

export function isSupabaseConfigured() {
  const cleanUrl = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://iiaqxrbnggcsgljqhwqe.supabase.co");
  const cleanKey = cleanSupabaseKey(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY
  );
  return Boolean(cleanUrl && cleanKey && !cleanUrl.includes("placeholder"));
}

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://iiaqxrbnggcsgljqhwqe.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cleanUrl = cleanSupabaseUrl(rawUrl) || "https://iiaqxrbnggcsgljqhwqe.supabase.co";
  const cleanKey = cleanSupabaseKey(anonKey) || "placeholder_anon_key";

  return createServerClient(
    cleanUrl,
    cleanKey,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (e) {
            // Called from a Server Component; middleware refreshes session instead.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (e) {
            // Ignore when called from a Server Component.
          }
        },
      },
    }
  );
}

// Admin client using the service-role key. SERVER-ONLY.
export function getSupabaseAdminClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://iiaqxrbnggcsgljqhwqe.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cleanUrl = cleanSupabaseUrl(rawUrl) || "https://iiaqxrbnggcsgljqhwqe.supabase.co";
  const cleanKey = cleanSupabaseKey(serviceKey) || "placeholder_service_role_key";

  return createClient(
    cleanUrl,
    cleanKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

