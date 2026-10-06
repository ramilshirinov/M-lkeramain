import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { recordActivity } from "@/lib/activityLogger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("reports")
      .select("*, listings(id, title, price, status), reporter:reporter_id(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ success: true, reports: data || [] });
  } catch (error) {
    console.error("[admin/reports] GET Xəta:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, message: "ID və status tələb olunur" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("reports")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await recordActivity({
      action: "ADMIN_REPORT_UPDATE",
      userEmail: "admin@mulkera.az",
      userName: "Admin",
      role: "admin",
      details: `Şikayət baxıldı (ID: ${id}): status = ${status}`,
    });

    return NextResponse.json({ success: true, report: data });
  } catch (error) {
    console.error("[admin/reports] PATCH Xəta:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
