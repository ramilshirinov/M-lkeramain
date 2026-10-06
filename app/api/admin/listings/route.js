import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { recordActivity } from "@/lib/activityLogger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const q = searchParams.get("q") || "";
    const limit = Number(searchParams.get("limit") || 50);

    const admin = getSupabaseAdmin();
    let query = admin
      .from("listings")
      .select("*, categories(name, name_az), districts(name, name_az), profiles:owner_id(full_name, email, phone)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (q) {
      query = query.or(`title.ilike.%${q}%,title_az.ilike.%${q}%,address.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, listings: data || [] });
  } catch (error) {
    console.error("[admin/listings] GET Xəta:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, status, is_vip } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID tələb olunur" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const updates = {};
    if (status) updates.status = status;
    if (typeof is_vip === "boolean") updates.is_vip = is_vip;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await admin
      .from("listings")
      .update(updates)
      .eq("id", id)
      .select("id, title, status, is_vip")
      .single();

    if (error) throw error;

    // Fəaliyyət jurnalına qeyd edirik
    await recordActivity({
      action: "ADMIN_LISTING_UPDATE",
      userEmail: "admin@mulkera.az",
      userName: "Admin",
      role: "admin",
      details: `Elan statusu dəyişdirildi (ID: ${id}): ${JSON.stringify(updates)}`,
    });

    return NextResponse.json({ success: true, listing: data });
  } catch (error) {
    console.error("[admin/listings] PATCH Xəta:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "ID tələb olunur" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.from("listings").delete().eq("id", id);
    if (error) throw error;

    await recordActivity({
      action: "ADMIN_LISTING_DELETE",
      userEmail: "admin@mulkera.az",
      userName: "Admin",
      role: "admin",
      details: `Elan admin tərəfindən silindi (ID: ${id})`,
    });

    return NextResponse.json({ success: true, message: "Elan silindi" });
  } catch (error) {
    console.error("[admin/listings] DELETE Xəta:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
