import { NextResponse } from "next/server";
import { incrementListingViewCount } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function POST(req, { params }) {
  try {
    const { id } = await params;

    // 1. Supabase-də baxış sayını artırırıq
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        const { data } = await supabase.from("listings").select("views_count").eq("id", id).single();
        if (data) {
          await supabase.from("listings").update({ views_count: (data.views_count || 0) + 1 }).eq("id", id);
        }
      } catch (sbErr) {
        console.warn("Supabase view count increment fallback:", sbErr.message);
      }
    }

    // 2. Local DB
    incrementListingViewCount(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
