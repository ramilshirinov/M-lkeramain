/**
 * Sanitizes and extracts a valid URL from environment variable,
 * handling cases where it was copied as markdown like [https://...](https://...)
 */
export function getSanitizedSupabaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "https://placeholder-mulkera.supabase.co";
  const str = String(raw).trim();
  const match = str.match(/https?:\/\/[^\s\)"'\]]+/);
  if (match) return match[0];
  if (str.startsWith("http")) return str;
  return "https://placeholder-mulkera.supabase.co";
}

export function getSanitizedSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
}

export function getSanitizedSupabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";
}
