import { NextResponse } from "next/server";
import { getListingById, updateListingById, deleteListingById, getSimilarListings } from "@/lib/backend/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const listing = getListingById(id);

    if (!listing) {
      return NextResponse.json({ success: false, message: "Elan tapılmadı" }, { status: 404 });
    }

    // Ağıllı oxşar elanlar alqoritmi (eyni məkan, yaxın qiymət, oxşar sahə)
    const related = getSimilarListings(listing.id, 4);

    return NextResponse.json({ success: true, data: listing, related });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { payload = {}, photoUrls, videoUrls } = body;

    const updated = updateListingById(id, payload, photoUrls, videoUrls);
    if (!updated) {
      return NextResponse.json({ success: false, message: "Elan tapılmadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const success = deleteListingById(id);
    if (!success) {
      return NextResponse.json({ success: false, message: "Elan tapılmadı və ya silinmədi" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Elan uğurla silindi" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
