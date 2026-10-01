import { createBrowserClient } from "@supabase/ssr";
import { getSanitizedSupabaseUrl, getSanitizedSupabaseAnonKey } from "./config";

let client;

export function createBrowserSupabase() {
  if (!client) {
    const url = getSanitizedSupabaseUrl();
    const anonKey = getSanitizedSupabaseAnonKey();
    client = createBrowserClient(url, anonKey);
  }
  return client;
}
