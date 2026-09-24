import { NextResponse } from "next/server";
import { getSimilarListings, getListingById } from "@/lib/backend/db";

/**
 * GET /api/listings/:id/similar
 * Recommendation Engine: Eyni məkanda (şəhər, rayon, qəsəbə),
 * qiymət fərqi ±20% və sahə fərqi ±15% aralığında olan oxşar elanları hesablayıb gətirir.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 4);

    const targetListing = getListingById(id);
    if (!targetListing) {
      return NextResponse.json(
        { success: false, error: "Elan tapılmadı." },
        { status: 404 }
      );
    }

    const similar = getSimilarListings(id, limit);

    return NextResponse.json({
      success: true,
      data: similar,
      total: similar.length,
      target: {
        id: targetListing.id,
        title: targetListing.title_az,
        price: targetListing.price,
        area: targetListing.area_m2 || targetListing.yard_sot,
        city: targetListing.selected_city,
        district_id: targetListing.district_id,
        district_name: targetListing.districts?.name_az,
        settlement: targetListing.settlement
      }
    });
  } catch (error) {
    console.error("Oxşar elanlar xətası:", error);
    return NextResponse.json(
      { success: false, error: "Oxşar elanları yükləyərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
