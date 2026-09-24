import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function cleanSupabaseUrl(url) {
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

function cleanSupabaseKey(key) {
  if (!key || typeof key !== "string") return "";
  return key.trim().replace(/^['"\[\(<]+|['"\]\)>]+$/g, "").trim();
}

export async function middleware(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = cleanSupabaseUrl(rawUrl);
  const supabaseAnonKey = cleanSupabaseKey(rawKey);

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
    return response;
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value;
          },
          set(name, value, options) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({ request: { headers: request.headers } });
            response.cookies.set({ name, value, ...options });
          },
          remove(name, options) {
            request.cookies.set({ name, value: "", ...options });
            response = NextResponse.next({ request: { headers: request.headers } });
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    await supabase.auth.getSession();
  } catch (err) {
    // Gracefully handle any connection or parse issue in middleware
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|api/public).*)",
  ],
};
