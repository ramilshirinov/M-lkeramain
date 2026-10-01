import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sb = getSupabaseAdmin();
    let query = sb
      .from("listings")
      .select("*, listing_photos(*), categories(*), districts(*)", { count: "exact" })
      .eq("status", "active");

    const city = searchParams.get("city");
    if (city && city !== "all") query = query.eq("city", city);

    const district = searchParams.get("district");
    if (district && district !== "all" && !isNaN(Number(district))) {
      query = query.eq("district_id", Number(district));
    }

    const type = searchParams.get("type");
    if (type && type !== "all") {
      if (type === "rent") {
        query = query.or("transaction_type.eq.rent,transaction_type.eq.long_term_rent");
      } else {
        query = query.eq("transaction_type", type);
      }
    }

    const category = searchParams.get("category");
    if (category && category !== "all" && !isNaN(Number(category))) {
      query = query.eq("category_id", Number(category));
    }

    const minPrice = searchParams.get("minPrice") || searchParams.get("min_price");
    if (minPrice) query = query.gte("price", Number(minPrice));
    const maxPrice = searchParams.get("maxPrice") || searchParams.get("max_price");
    if (maxPrice) query = query.lte("price", Number(maxPrice));

    const minArea = searchParams.get("minArea") || searchParams.get("min_area");
    if (minArea) query = query.gte("area_m2", Number(minArea));
    const maxArea = searchParams.get("maxArea") || searchParams.get("max_area");
    if (maxArea) query = query.lte("area_m2", Number(maxArea));

    const rooms = searchParams.get("rooms");
    if (rooms && rooms !== "all") {
      if (rooms === "4+") {
        query = query.gte("room_count", 4);
      } else if (!isNaN(Number(rooms))) {
        query = query.eq("room_count", Number(rooms));
      }
    }

    const search = searchParams.get("search");
    if (search) {
      const s = search.trim();
      query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,address.ilike.%${s}%`);
    }

    const sort = searchParams.get("sort") || "vip_first";
    if (sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("is_vip", { ascending: false }).order("created_at", { ascending: false });
    }

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Number(searchParams.get("limit") || 12));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      console.error("Filter error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Filter route error:", error);
    return NextResponse.json(
      { success: false, error: "Elanları filtrləyərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const sb = getSupabaseAdmin();
    let query = sb
      .from("listings")
      .select("*, listing_photos(*), categories(*), districts(*)", { count: "exact" })
      .eq("status", "active");

    if (body.city && body.city !== "all") query = query.eq("city", body.city);
    if (body.district && body.district !== "all" && !isNaN(Number(body.district))) {
      query = query.eq("district_id", Number(body.district));
    }

    if (body.type && body.type !== "all") {
      if (body.type === "rent") {
        query = query.or("transaction_type.eq.rent,transaction_type.eq.long_term_rent");
      } else {
        query = query.eq("transaction_type", body.type);
      }
    }

    if (body.category && body.category !== "all" && !isNaN(Number(body.category))) {
      query = query.eq("category_id", Number(body.category));
    }

    if (body.minPrice) query = query.gte("price", Number(body.minPrice));
    if (body.maxPrice) query = query.lte("price", Number(body.maxPrice));
    if (body.minArea) query = query.gte("area_m2", Number(body.minArea));
    if (body.maxArea) query = query.lte("area_m2", Number(body.maxArea));

    if (body.rooms && body.rooms !== "all") {
      if (body.rooms === "4+") {
        query = query.gte("room_count", 4);
      } else if (!isNaN(Number(body.rooms))) {
        query = query.eq("room_count", Number(body.rooms));
      }
    }

    if (body.search) {
      const s = body.search.trim();
      query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,address.ilike.%${s}%`);
    }

    const sort = body.sort || "vip_first";
    if (sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("is_vip", { ascending: false }).order("created_at", { ascending: false });
    }

    const page = Math.max(1, Number(body.page || 1));
    const limit = Math.max(1, Number(body.limit || 12));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      console.error("Filter POST error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Filter POST route error:", error);
    return NextResponse.json(
      { success: false, error: "Elanları filtrləyərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
