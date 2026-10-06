import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { recordActivity } from "@/lib/activityLogger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "all";
    const status = searchParams.get("status") || "all";
    const q = searchParams.get("q") || "";
    const limit = Number(searchParams.get("limit") || 50);

    const admin = getSupabaseAdmin();
    let query = admin
      .from("profiles")
      .select("id, email, full_name, phone, role, status, approval_status, is_approved_realtor, agency_name, commission_rate, created_at, rating, sales_count")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (role !== "all") {
      query = query.eq("role", role);
    }

    if (status === "pending_realtor") {
      query = query.or("approval_status.eq.pending,is_approved_realtor.eq.false").eq("role", "realtor");
    }

    if (q) {
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, users: data || [] });
  } catch (error) {
    console.error("[admin/users] GET Xəta:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, role, is_approved_realtor, approval_status } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID tələb olunur" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const updates = {};
    if (role) updates.role = role;
    if (typeof is_approved_realtor === "boolean") updates.is_approved_realtor = is_approved_realtor;
    if (approval_status) updates.approval_status = approval_status;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await recordActivity({
      action: "ADMIN_USER_UPDATE",
      userEmail: "admin@mulkera.az",
      userName: "Admin",
      role: "admin",
      details: `İstifadəçi statusu dəyişdirildi (${data.email || id}): ${JSON.stringify(updates)}`,
    });

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    console.error("[admin/users] PATCH Xəta:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
