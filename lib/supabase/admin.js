import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSanitizedSupabaseUrl, getSanitizedSupabaseServiceKey } from "./config";

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key && !url.includes("placeholder"));
}

export function getSupabaseAdmin() {
  const url = getSanitizedSupabaseUrl();
  const key = getSanitizedSupabaseServiceKey();

  return createClient(
    url,
    key,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export const getSupabaseAdminClient = getSupabaseAdmin;
