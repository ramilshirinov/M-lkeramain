import { NextResponse } from "next/server";
import { getListingReviews, addListingReview, addRealtorReview, getDb } from "@/lib/backend/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("listing_id");
    const realtorId = searchParams.get("realtor_id");

    const db = getDb();

    if (listingId) {
      const data = getListingReviews(listingId);
      return NextResponse.json({ success: true, ...data });
    }

    if (realtorId) {
      const reviews = (db.reviews || []).filter((r) => String(r.realtor_id) === String(realtorId));
      const avg = reviews.length > 0
        ? Number((reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / reviews.length).toFixed(1))
        : 5.0;
      return NextResponse.json({ success: true, reviews, count: reviews.length, averageRating: avg });
    }

    return NextResponse.json({ success: true, reviews: db.reviews || [], count: (db.reviews || []).length });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { listing_id, realtor_id, rating, comment, reviewer_name, user_id } = body;

    if (!rating || !comment) {
      return NextResponse.json({ success: false, message: "Reytinq və rəy mətni məcburidir." }, { status: 400 });
    }

    if (listing_id) {
      const newReview = addListingReview({
        listingId: listing_id,
        reviewer_name,
        reviewer_id: user_id,
        rating,
        comment,
      });
      return NextResponse.json({ success: true, data: newReview });
    }

    if (realtor_id) {
      const newReview = addRealtorReview(realtor_id, {
        reviewer_name,
        user_id,
        rating,
        comment,
      });
      return NextResponse.json({ success: true, data: newReview });
    }

    return NextResponse.json({ success: false, message: "Elan və ya rieltor ID tələb olunur." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
