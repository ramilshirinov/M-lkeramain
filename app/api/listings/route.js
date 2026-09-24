import { NextResponse } from "next/server";
import { queryListings, insertListing } from "@/lib/backend/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "all";
    const category = searchParams.get("category") || "all";
    const city = searchParams.get("city") || "all";
    const district = searchParams.get("district") || "all";
    const rooms = searchParams.get("rooms") || "all";
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const minArea = searchParams.get("min_area");
    const maxArea = searchParams.get("max_area");
    const sort = searchParams.get("sort") || "newest";
    const ownerId = searchParams.get("owner_id");
    const mortgageOnly = searchParams.get("mortgage") === "true";
    const allStatuses = searchParams.get("all_statuses") === "true";

    const listings = queryListings({
      search,
      type,
      category,
      city,
      district,
      rooms,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      sort,
      ownerId,
      mortgageOnly,
      allStatuses,
    });

    return NextResponse.json({ success: true, data: listings, count: listings.length });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { payload, photoUrls = [], videoUrls = [] } = body;

    if (!payload || !payload.title_az || !payload.price) {
      return NextResponse.json({ success: false, message: "Məcburi sahələri doldurun." }, { status: 400 });
    }

    const userIdCookie = req.cookies.get("mulkera_user_id");
    if (!payload.owner_id && userIdCookie?.value) {
      payload.owner_id = userIdCookie.value;
    }
    if (!payload.owner_id) {
      payload.owner_id = "admin-001";
    }

    const newListing = insertListing(payload, photoUrls, videoUrls);
    return NextResponse.json({ success: true, data: newListing });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
