import { NextResponse } from "next/server";
import { queryListings } from "@/lib/backend/db";

/**
 * GET / POST /api/listings/filter
 * Ərazi İyerarxiyası, Torpaq Sahəsi (sot/kv.m), Qiymət və Otaq sayı üzrə
 * dərinləşdirilmiş axtarış və filtrləmə mühərriki.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      city: searchParams.get("city") || "all",
      district: searchParams.get("district") || "all",
      settlement: searchParams.get("settlement") || "all",
      type: searchParams.get("type") || "all",
      category: searchParams.get("category") || "all",
      rooms: searchParams.get("rooms") || "all",
      minRooms: searchParams.get("minRooms") || null,
      maxRooms: searchParams.get("maxRooms") || null,
      minPrice: searchParams.get("minPrice") || null,
      maxPrice: searchParams.get("maxPrice") || null,
      minArea: searchParams.get("minArea") || null,
      maxArea: searchParams.get("maxArea") || null,
      minSot: searchParams.get("minSot") || null,
      maxSot: searchParams.get("maxSot") || null,
      mortgageOnly: searchParams.get("mortgage") === "true",
      hasKupcha: searchParams.get("hasKupcha") === "true",
      isVipOnly: searchParams.get("vipOnly") === "true",
      search: searchParams.get("search") || "",
      sort: searchParams.get("sort") || "vip_first"
    };

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Number(searchParams.get("limit") || 12));

    const results = queryListings(filters);
    const total = results.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = results.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginatedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages
      },
      filtersApplied: filters
    });
  } catch (error) {
    console.error("Filtrləmə xətası (GET):", error);
    return NextResponse.json(
      { success: false, error: "Elanları filtrləyərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const filters = {
      city: body.city || "all",
      district: body.district || "all",
      settlement: body.settlement || "all",
      type: body.type || "all",
      category: body.category || "all",
      rooms: body.rooms || "all",
      minRooms: body.minRooms || null,
      maxRooms: body.maxRooms || null,
      minPrice: body.minPrice || null,
      maxPrice: body.maxPrice || null,
      minArea: body.minArea || null,
      maxArea: body.maxArea || null,
      minSot: body.minSot || null,
      maxSot: body.maxSot || null,
      mortgageOnly: Boolean(body.mortgageOnly || body.mortgage),
      hasKupcha: Boolean(body.hasKupcha || body.has_kupcha),
      isVipOnly: Boolean(body.isVipOnly || body.vipOnly),
      search: body.search || "",
      sort: body.sort || "vip_first"
    };

    const page = Math.max(1, Number(body.page || 1));
    const limit = Math.max(1, Number(body.limit || 12));

    const results = queryListings(filters);
    const total = results.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = results.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginatedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages
      },
      filtersApplied: filters
    });
  } catch (error) {
    console.error("Filtrləmə xətası (POST):", error);
    return NextResponse.json(
      { success: false, error: "Elanları filtrləyərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
