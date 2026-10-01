import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
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
    const ownerKind = searchParams.get("owner_kind");

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("listings")
      .select("*, listing_photos(*), categories(*), districts(*)");

    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    } else {
      query = query.eq("status", "active");
    }

    if (ownerKind && ownerKind !== "all") {
      query = query.eq("owner_kind", ownerKind);
    }

    if (type && type !== "all") {
      if (type === "rent") {
        query = query.or("transaction_type.eq.rent,transaction_type.eq.long_term_rent");
      } else if (type === "daily" || type === "daily_rent") {
        query = query.in("transaction_type", ["daily_rent", "daily", "short_term_rent"]);
      } else {
        query = query.eq("transaction_type", type);
      }
    }

    if (category && category !== "all" && !isNaN(Number(category))) {
      query = query.eq("category_id", Number(category));
    }

    if (district && district !== "all" && !isNaN(Number(district))) {
      query = query.eq("district_id", Number(district));
    }

    if (city && city !== "all") {
      query = query.eq("city", city);
    }

    if (minPrice) query = query.gte("price", Number(minPrice));
    if (maxPrice) query = query.lte("price", Number(maxPrice));
    if (minArea) query = query.gte("area_m2", Number(minArea));
    if (maxArea) query = query.lte("area_m2", Number(maxArea));

    if (rooms && rooms !== "all") {
      if (rooms === "4+") {
        query = query.gte("room_count", 4);
      } else if (!isNaN(Number(rooms))) {
        query = query.eq("room_count", Number(rooms));
      }
    }

    if (sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else if (sort === "oldest") {
      query = query.order("created_at", { ascending: true });
    } else {
      query = query.order("is_vip", { ascending: false }).order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      console.error("Supabase listings error:", error);
      return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
    }

    let results = data || [];
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(
        (item) =>
          item.title?.toLowerCase().includes(s) ||
          item.description?.toLowerCase().includes(s) ||
          item.address?.toLowerCase().includes(s) ||
          item.city?.toLowerCase().includes(s)
      );
    }

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (err) {
    console.error("GET /api/listings error:", err);
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}
