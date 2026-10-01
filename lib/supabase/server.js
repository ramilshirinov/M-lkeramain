import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSanitizedSupabaseUrl, getSanitizedSupabaseAnonKey } from "./config";

export async function getSupabaseServer() {
  const store = await cookies();
  const url = getSanitizedSupabaseUrl();
  const anonKey = getSanitizedSupabaseAnonKey();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {}
        },
      },
    }
  );
}
