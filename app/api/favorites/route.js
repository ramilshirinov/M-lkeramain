import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawIds = searchParams.get("ids") || "";
    const idsList = rawIds
      ? rawIds.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const sbAdmin = getSupabaseAdmin();

    // 1. If explicit listing IDs passed (guest localStorage)
    if (idsList.length > 0) {
      const { data, error } = await sbAdmin
        .from("listings")
        .select("*, listing_photos(*), categories(*), districts(*)")
        .in("id", idsList);

      if (error) {
        return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: data || [] });
    }

    // 2. Authenticated user favorites
    const sb = await getSupabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data: favs, error: favErr } = await sb
      .from("favorites")
      .select("listing_id, listings(*, listing_photos(*), categories(*), districts(*))")
      .eq("user_id", user.id);

    if (favErr) {
      return NextResponse.json({ success: false, message: favErr.message, data: [] }, { status: 500 });
    }

    const list = (favs || []).map((f) => f.listings).filter(Boolean);
    return NextResponse.json({ success: true, data: list });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}
