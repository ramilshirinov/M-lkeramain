import { NextResponse } from "next/server";
import { getUserProfileById } from "@/lib/backend/db";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function GET(req) {
  try {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseServerClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
          return NextResponse.json({ user, profile: profile || user });
        }
      } catch (sbErr) {
        console.warn("Supabase auth/me fallback:", sbErr.message);
      }
    }

    const userIdCookie = req.cookies.get("mulkera_user_id");
    let userId = userIdCookie?.value;

    if (!userId) {
      userId = req.headers.get("x-user-id");
    }

    if (!userId) {
      return NextResponse.json({ user: null, profile: null });
    }

    const user = getUserProfileById(userId);
    return NextResponse.json({ user: user || null, profile: user || null });
  } catch (err) {
    return NextResponse.json({ user: null, profile: null });
  }
}
