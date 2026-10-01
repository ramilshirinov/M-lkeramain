import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "rating";
    const area = (searchParams.get("area") || "").trim().toLowerCase();

    const sb = getSupabaseAdmin();
    let query = sb
      .from("public_profiles")
      .select("*")
      .eq("role", "realtor");

    if (sort === "sales") {
      query = query.order("sales_count", { ascending: false, nullsFirst: false });
    } else if (sort === "speed") {
      query = query.order("sales_speed_days", { ascending: true, nullsFirst: false });
    } else {
      query = query.order("rating", { ascending: false, nullsFirst: false });
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
    }

    let realtors = data || [];
    if (area) {
      realtors = realtors.filter((r) =>
        (r.service_areas || []).some((a) => a.toLowerCase().includes(area))
      );
    }

    return NextResponse.json({
      success: true,
      data: realtors,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}
