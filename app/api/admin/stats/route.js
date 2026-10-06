import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getRecentActivities } from "@/lib/activityLogger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const admin = getSupabaseAdmin();

    // 1. Elanların statistikası
    const [
      { count: totalListings },
      { count: activeListings },
      { count: pendingListings },
      { count: soldListings },
      { data: viewsData },
    ] = await Promise.all([
      admin.from("listings").select("id", { count: "exact", head: true }),
      admin.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("listings").select("id", { count: "exact", head: true }).eq("status", "sold"),
      admin.from("listings").select("views_count, view_count"),
    ]);

    const totalViews = (viewsData || []).reduce(
      (sum, item) => sum + (item.views_count || item.view_count || 0),
      0
    );

    // 2. İstifadəçilərin statistikası
    const [
      { count: totalUsers },
      { count: realtorsCount },
      { count: pendingRealtorsCount },
      { count: reportsCount },
    ] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "realtor"),
      admin.from("profiles").select("id", { count: "exact", head: true }).or("approval_status.eq.pending,is_approved_realtor.eq.false"),
      admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    // 3. Son 10 fəaliyyət jurnalı ("kim nə edib")
    const recentActivities = await getRecentActivities(15);

    return NextResponse.json({
      success: true,
      stats: {
        listings: {
          total: totalListings || 0,
          active: activeListings || 0,
          pending: pendingListings || 0,
          sold: soldListings || 0,
          totalViews,
        },
        users: {
          total: totalUsers || 0,
          realtors: realtorsCount || 0,
          pendingRealtors: pendingRealtorsCount || 0,
        },
        reports: {
          pending: reportsCount || 0,
        },
      },
      recentActivities,
    });
  } catch (error) {
    console.error("[admin/stats] Xəta:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Statistika alına bilmədi" },
      { status: 500 }
    );
  }
}
