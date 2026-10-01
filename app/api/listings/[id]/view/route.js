import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const sb = getSupabaseAdmin();
    const { data } = await sb.from("listings").select("views_count").eq("id", id).maybeSingle();
    if (data) {
      await sb
        .from("listings")
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq("id", id);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
