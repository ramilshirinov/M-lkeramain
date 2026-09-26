import { NextResponse } from "next/server";
import { getUserFavorites } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdCookie = req.cookies.get("mulkera_user_id");
    const userId = searchParams.get("userId") || userIdCookie?.value;

    if (!userId) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 1. Supabase-dən oxumaq
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
          .from("favorites")
          .select("listing_id, created_at, listings(*, listing_photos(*), categories(*), districts(*))")
          .eq("user_id", userId);

        if (!error && Array.isArray(data) && data.length > 0) {
          const list = data
            .map((item) => item.listings)
            .filter(Boolean);
          return NextResponse.json({ success: true, data: list, source: "supabase" });
        }
      } catch (sbErr) {
        console.warn("Supabase favorites query fallback:", sbErr.message);
      }
    }

    // 2. Local Database fallback
    const favs = getUserFavorites(userId);
    return NextResponse.json({ success: true, data: favs, source: "local" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}
