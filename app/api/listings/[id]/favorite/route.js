import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const sb = await getSupabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ favorited: false });
    }

    const { data } = await sb
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", id)
      .maybeSingle();

    return NextResponse.json({ favorited: !!data });
  } catch (err) {
    return NextResponse.json({ favorited: false });
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const sb = await getSupabaseServer();
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { success: false, requiresAuth: true, message: "not_authenticated" },
        { status: 401 }
      );
    }

    const { data: existing } = await sb
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", id)
      .maybeSingle();

    if (existing) {
      await sb
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", id);
      return NextResponse.json({ success: true, favorited: false });
    } else {
      await sb
        .from("favorites")
        .insert([{ user_id: user.id, listing_id: id }]);
      return NextResponse.json({ success: true, favorited: true });
    }
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
