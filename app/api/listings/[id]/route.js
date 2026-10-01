import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/api";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const sb = getSupabaseAdmin();
    const { data: listing, error } = await sb
      .from("listings")
      .select("*, listing_photos(*), categories(*), districts(*)")
      .eq("id", id)
      .maybeSingle();

    if (error || !listing) {
      return NextResponse.json({ success: false, message: "Elan tapılmadı" }, { status: 404 });
    }

    let related = [];
    try {
      const { data: relData } = await sb
        .from("listings")
        .select("*, listing_photos(*)")
        .neq("id", id)
        .eq("status", "active")
        .limit(4);
      if (relData) related = relData;
    } catch {}

    return NextResponse.json({ success: true, data: listing, related });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { user, sb } = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const { payload = {} } = body;

    // Verify ownership
    const { data: existing } = await sb
      .from("listings")
      .select("owner_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing || existing.owner_id !== user.id) {
      return NextResponse.json({ success: false, message: "forbidden" }, { status: 403 });
    }

    const updates = {
      updated_at: new Date().toISOString(),
    };
    const ALLOWED = [
      "title",
      "title_az",
      "title_ru",
      "title_en",
      "description",
      "description_az",
      "description_ru",
      "description_en",
      "transaction_type",
      "category_id",
      "district_id",
      "city",
      "selected_city",
      "address",
      "latitude",
      "longitude",
      "price",
      "currency",
      "area_m2",
      "room_count",
      "floor",
      "floor_total",
      "yard_sot",
      "phone_number",
      "documents",
      "owner_kind",
      "status",
      "sold_at",
    ];

    for (const key of ALLOWED) {
      if (payload[key] !== undefined) {
        updates[key] = payload[key];
      }
    }

    const { data, error } = await sb
      .from("listings")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: err.status || 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { user, sb } = await requireUser();
    const { id } = await params;

    const { error } = await sb
      .from("listings")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Elan silindi" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: err.status || 500 });
  }
}
