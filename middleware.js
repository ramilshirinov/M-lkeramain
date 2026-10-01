import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function sanitizeUrl(raw) {
  if (!raw) return "";
  const match = String(raw).trim().match(/https?:\/\/[^\s\)"'\]]+/);
  return match ? match[0] : "";
}

export async function middleware(request) {
  let response = NextResponse.next({ request });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = sanitizeUrl(rawUrl);

  if (!url || !anonKey || url.includes("placeholder")) {
    return response;
  }

  try {
    const supabase = createServerClient(
      url,
      anonKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list) => {
            list.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      }
    );

    await supabase.auth.getUser();
  } catch {}

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
};
