import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/api";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("listing_id");
    const realtorId = searchParams.get("realtor_id");

    const sb = getSupabaseAdmin();
    let query = sb
      .from("realtor_reviews")
      .select("*")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false });

    if (realtorId) {
      query = query.eq("realtor_id", realtorId);
    } else if (listingId) {
      query = query.eq("listing_id", listingId);
    } else {
      return NextResponse.json({ success: true, reviews: [], count: 0, averageRating: null });
    }

    const { data: reviews, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const list = reviews || [];
    const count = list.length;
    const avg =
      count > 0
        ? Number(
            (list.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count).toFixed(1)
          )
        : null;

    return NextResponse.json({
      success: true,
      reviews: list,
      count,
      averageRating: avg,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, sb } = await requireUser();
    const body = await req.json();
    const { realtor_id, listing_id, rating, comment } = body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return NextResponse.json({ success: false, message: "rating_invalid" }, { status: 400 });
    }

    if (realtor_id && realtor_id === user.id) {
      return NextResponse.json({ success: false, message: "cannot_review_self" }, { status: 400 });
    }

    // Fetch user profile name
    const { data: profile } = await sb
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const reviewerName = profile?.full_name || user.email?.split("@")[0] || "İstifadəçi";

    const { data, error } = await sb
      .from("realtor_reviews")
      .insert([
        {
          realtor_id: realtor_id || null,
          listing_id: listing_id || null,
          reviewer_id: user.id,
          reviewer_name: reviewerName,
          rating: Number(rating),
          comment: (comment || "").trim(),
          is_hidden: false,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, review: data });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: err.status || 500 });
  }
}
