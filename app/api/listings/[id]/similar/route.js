import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 4);

    const sb = getSupabaseAdmin();
    const { data: targetListing, error: targetError } = await sb
      .from("listings")
      .select("*, categories(*), districts(*)")
      .eq("id", id)
      .maybeSingle();

    if (targetError || !targetListing) {
      return NextResponse.json({ success: false, error: "Elan tapılmadı." }, { status: 404 });
    }

    let query = sb
      .from("listings")
      .select("*, listing_photos(*), categories(*), districts(*)")
      .neq("id", id)
      .eq("status", "active");

    if (targetListing.category_id) {
      query = query.eq("category_id", targetListing.category_id);
    }
    if (targetListing.city) {
      query = query.eq("city", targetListing.city);
    }

    const { data: similar, error: simError } = await query.limit(limit);

    return NextResponse.json({
      success: true,
      data: similar || [],
      total: similar ? similar.length : 0,
      target: {
        id: targetListing.id,
        title: targetListing.title || targetListing.title_az,
        price: targetListing.price,
        area: targetListing.area_m2 || targetListing.yard_sot,
        city: targetListing.city,
      },
    });
  } catch (error) {
    console.error("Oxşar elanlar xətası:", error);
    return NextResponse.json(
      { success: false, error: "Oxşar elanları yükləyərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
