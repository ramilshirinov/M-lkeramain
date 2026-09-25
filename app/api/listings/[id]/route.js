import { NextResponse } from "next/server";
import { getListingById, updateListingById, deleteListingById, getSimilarListings } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    // 1. Supabase-dən elanı və şəkillərini çəkirik
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        const { data: listing, error } = await supabase
          .from("listings")
          .select("*, listing_photos(*), categories(*), districts(*)")
          .eq("id", id)
          .maybeSingle();

        if (!error && listing) {
          // Oxşar elanlar
          let related = [];
          try {
            const { data: relData } = await supabase
              .from("listings")
              .select("*, listing_photos(*)")
              .neq("id", id)
              .limit(4);
            if (relData) related = relData;
          } catch (relErr) {
            // ignore
          }

          return NextResponse.json({ success: true, data: listing, related, source: "supabase" });
        }
      } catch (sbErr) {
        console.warn("Supabase single listing error:", sbErr.message);
      }
    }

    // 2. Fallback: local db
    const listing = getListingById(id);
    if (!listing) {
      return NextResponse.json({ success: false, message: "Elan tapılmadı" }, { status: 404 });
    }

    const related = getSimilarListings(listing.id, 4);
    return NextResponse.json({ success: true, data: listing, related, source: "local" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { payload = {}, photoUrls, videoUrls } = body;

    let updated = null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        const updates = {
          updated_at: new Date().toISOString(),
        };

        if (payload.title) updates.title = payload.title;
        if (payload.title_az) updates.title = payload.title_az;
        if (payload.description) updates.description = payload.description;
        if (payload.description_az) updates.description = payload.description_az;
        if (payload.price !== undefined) updates.price = Number(payload.price);
        if (payload.currency) updates.currency = payload.currency;
        if (payload.room_count !== undefined) updates.room_count = Number(payload.room_count);
        if (payload.area_m2 !== undefined) updates.area_m2 = Number(payload.area_m2);
        if (payload.floor_number !== undefined) updates.floor = Number(payload.floor_number);
        if (payload.total_floors !== undefined) updates.floor_total = Number(payload.total_floors);
        if (payload.address) updates.address = payload.address;
        if (payload.latitude !== undefined) updates.latitude = payload.latitude ? Number(payload.latitude) : null;
        if (payload.longitude !== undefined) updates.longitude = payload.longitude ? Number(payload.longitude) : null;
        if (payload.phone_number) updates.phone_number = payload.phone_number;

        const { data, error } = await supabase
          .from("listings")
          .update(updates)
          .eq("id", id)
          .select()
          .maybeSingle();

        if (!error && data) {
          updated = data;
        }
      } catch (sbErr) {
        console.warn("Supabase update listing warning:", sbErr.message);
      }
    }

    const localUpdated = updateListingById(id, payload, photoUrls, videoUrls);
    if (!updated && !localUpdated) {
      return NextResponse.json({ success: false, message: "Elan tapılmadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated || localUpdated });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        await supabase.from("listings").delete().eq("id", id);
      } catch (sbErr) {
        console.warn("Supabase delete listing warning:", sbErr.message);
      }
    }

    deleteListingById(id);
    return NextResponse.json({ success: true, message: "Elan uğurla silindi" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
