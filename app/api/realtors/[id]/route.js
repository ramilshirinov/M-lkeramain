import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/api";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const sb = getSupabaseAdmin();

    const { data: realtor, error: rError } = await sb
      .from("public_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (rError || !realtor) {
      return NextResponse.json({ success: false, message: "Rieltor tapılmadı" }, { status: 404 });
    }

    // Listings owned by this realtor
    const { data: listings } = await sb
      .from("listings")
      .select("*, listing_photos(*), categories(*), districts(*)")
      .eq("owner_id", id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    // Reviews for this realtor
    const { data: reviews } = await sb
      .from("realtor_reviews")
      .select("*")
      .eq("realtor_id", id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        realtor,
        listings: listings || [],
        reviews: reviews || [],
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const { user, sb } = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const { rating, comment } = body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return NextResponse.json({ success: false, message: "rating_invalid" }, { status: 400 });
    }

    if (id === user.id) {
      return NextResponse.json({ success: false, message: "cannot_review_self" }, { status: 400 });
    }

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
          realtor_id: id,
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

    return NextResponse.json({
      success: true,
      message: "Rəyiniz uğurla əlavə olundu!",
      data,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: err.status || 500 });
  }
}
