import { NextResponse } from "next/server";
import { toggleListingFavorite, getDb } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userIdQuery = searchParams.get("userId");
    const userIdCookie = req.cookies.get("mulkera_user_id");
    const userId = userIdQuery || userIdCookie?.value;

    if (!userId) {
      return NextResponse.json({ favorited: false });
    }

    // 1. Supabase-dən yoxlayırıq
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", userId)
          .eq("listing_id", id)
          .maybeSingle();

        if (!error && data) {
          return NextResponse.json({ favorited: true, source: "supabase" });
        }
      } catch (sbErr) {
        console.warn("Supabase favorite GET error:", sbErr.message);
      }
    }

    // 2. Fallback: local backend
    const db = getDb();
    const exists = db.favorites?.some(
      (f) => String(f.user_id) === String(userId) && String(f.listing_id) === String(id)
    );

    return NextResponse.json({ favorited: !!exists, source: "local" });
  } catch (err) {
    return NextResponse.json({ favorited: false });
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const userIdCookie = req.cookies.get("mulkera_user_id");
    const userId = body.userId || userIdCookie?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, requiresAuth: true, message: "Giriş tələb olunur" },
        { status: 401 }
      );
    }

    let isNowFavorited = false;

    // 1. Supabase cədvəli ilə əlaqələndirmə
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        const { data: existing } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", userId)
          .eq("listing_id", id)
          .maybeSingle();

        if (existing) {
          // Əgər artıq varsa, silirik
          await supabase.from("favorites").delete().eq("id", existing.id);
          isNowFavorited = false;
        } else {
          // Yoxdursa, əlavə edirik
          await supabase.from("favorites").insert({
            user_id: userId,
            listing_id: id,
            created_at: new Date().toISOString(),
          });
          isNowFavorited = true;
        }
      } catch (sbErr) {
        console.warn("Supabase favorite POST error:", sbErr.message);
      }
    }

    // 2. Həmçinin local DB-ni də sinxron saxlayırıq
    const localResult = toggleListingFavorite(userId, id);
    if (localResult && typeof localResult.favorited === "boolean") {
      isNowFavorited = localResult.favorited;
    }

    return NextResponse.json({
      success: true,
      favorited: isNowFavorited,
      listingId: id,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
