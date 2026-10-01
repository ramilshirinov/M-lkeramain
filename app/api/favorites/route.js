import { NextResponse } from "next/server";
import { getUserFavorites, getListingById, getDb } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdCookie = req.cookies.get("mulkera_user_id");
    const userId = searchParams.get("userId") || userIdCookie?.value;
    const rawIds = searchParams.get("ids") || "";
    const idsList = rawIds ? rawIds.split(",").map((s) => s.trim()).filter(Boolean) : [];

    // 1. Əgər ID siyahısı verilibsə (qonaq və ya localStorage favoritləri)
    if (idsList.length > 0) {
      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdminClient();
          const { data, error } = await supabase
            .from("listings")
            .select("*, listing_photos(*), categories(*), districts(*)")
            .in("id", idsList);

          if (!error && Array.isArray(data) && data.length > 0) {
            return NextResponse.json({ success: true, data, source: "supabase_ids" });
          }
        } catch (sbErr) {
          console.warn("Supabase favorites by ids error:", sbErr.message);
        }
      }

      const db = getDb();
      const localMatches = (db.listings || []).filter((l) =>
        idsList.some((id) => String(id) === String(l.id))
      );
      return NextResponse.json({ success: true, data: localMatches, source: "local_ids" });
    }

    if (!userId) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. Daxil olmuş istifadəçinin favoritləri
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

    // 3. Local Database fallback
    const favs = getUserFavorites(userId);
    return NextResponse.json({ success: true, data: favs, source: "local" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}
