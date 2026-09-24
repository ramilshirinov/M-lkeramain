import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function cleanSupabaseUrl(url) {
  if (!url) return "https://placeholder.supabase.co";
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cleanUrl = cleanSupabaseUrl(rawUrl);

  return createServerClient(
    cleanUrl,
    anonKey || "placeholder_key",
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

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && anonKey && !url.includes("placeholder"));
}

// Admin client using the service-role key. SERVER-ONLY.
export function getSupabaseAdminClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cleanUrl = cleanSupabaseUrl(rawUrl);

  return createClient(
    cleanUrl,
    serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_service_role_key",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
