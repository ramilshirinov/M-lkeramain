import { NextResponse } from "next/server";
import { getRankedRealtors, getDb, saveDb, enrichListing } from "@/lib/backend/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const realtors = getRankedRealtors();
    let realtor = realtors.find((r) => String(r.id) === String(id));

    const db = getDb();
    if (!realtor) {
      realtor = db.users.find((u) => String(u.id) === String(id) || u.role === "realtor");
    }

    if (!realtor) {
      realtor = realtors[0] || null;
    }

    if (!realtor) {
      return NextResponse.json({ success: false, message: "Rieltor tapılmadı" }, { status: 404 });
    }

    // Bu rieltora aid elanlar
    let listings = db.listings.filter(
      (l) => String(l.owner_id) === String(realtor.id) || String(l.user_id) === String(realtor.id)
    );

    // Əgər spesifik elan yoxdursa, vitrində nümayiş üçün bir neçə aktiv elan əlaqələndirək
    if (listings.length === 0) {
      listings = db.listings.slice(0, 4);
    }

    return NextResponse.json({
      success: true,
      data: {
        realtor,
        listings: listings.map((l) => enrichListing(l, db)),
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { reviewer_name, rating, comment } = body;

    const db = getDb();
    if (!db.reviews) db.reviews = [];

    const newReview = {
      id: `rev-${Date.now()}`,
      realtor_id: String(id),
      author_name: reviewer_name || "Müştəri",
      rating: Number(rating) || 5,
      comment: comment || "",
      created_at: new Date().toISOString(),
    };

    db.reviews.unshift(newReview);
    saveDb(db);

    return NextResponse.json({
      success: true,
      message: "Rəyiniz uğurla əlavə olundu!",
      data: newReview,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
