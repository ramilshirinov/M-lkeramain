import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const sb = getSupabaseAdmin();
    const { data: user, error: uError } = await sb
      .from("public_profiles")
      .select("id, full_name, agency_name, role")
      .eq("id", id)
      .maybeSingle();

    if (uError || !user) {
      return NextResponse.json({ success: false, error: "İstifadəçi tapılmadı." }, { status: 404 });
    }

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Number(searchParams.get("limit") || 6));
    const status = searchParams.get("status") || "active";
    const type = searchParams.get("type") || "all";

    let query = sb
      .from("listings")
      .select("*, listing_photos(*), categories(*), districts(*)", { count: "exact" })
      .eq("owner_id", id)
      .eq("status", status);

    if (type !== "all") {
      if (type === "rent") {
        query = query.or("transaction_type.eq.rent,transaction_type.eq.long_term_rent");
      } else {
        query = query.eq("transaction_type", type);
      }
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) {
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
      user,
    });
  } catch (error) {
    console.error("User listings error:", error);
    return NextResponse.json(
      { success: false, error: "İstifadəçi elanlarını yükləyərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
