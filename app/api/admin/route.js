import { NextResponse } from "next/server";
import {
  getAdminDashboardData,
  approveRealtorApplication,
  rejectRealtorApplication,
  toggleListingVipStatus,
  deleteListingById,
  dismissReportById,
} from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const data = getAdminDashboardData();

    // Supabase-dən şikayətləri və rəy şikayətlərini zənginləşdiririk
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();

        // 1. Rəy şikayətləri (review_reports)
        const { data: revReports } = await supabase
          .from("review_reports")
          .select("*, realtor_reviews(id, comment, rating, reviewer_name, is_hidden, is_reported)")
          .order("created_at", { ascending: false });

        if (revReports) {
          data.reviewReports = revReports;
        }

        // 2. Təsdiq gözləyən rieltorlar
        const { data: pendingUsers } = await supabase
          .from("profiles")
          .select("*")
          .eq("status", "pending")
          .eq("role", "realtor");

        if (pendingUsers && pendingUsers.length > 0) {
          data.pendingRealtors = pendingUsers;
        }

        // 3. Aktiv elanlar
        const { data: sbListings } = await supabase
          .from("listings")
          .select("*, listing_photos(url)")
          .order("created_at", { ascending: false });

        if (sbListings && sbListings.length > 0) {
          data.listings = sbListings;
        }
      } catch (sbErr) {
        console.warn("Admin Supabase enrichment warning:", sbErr.message);
      }
    }

    return NextResponse.json({ success: true, ...data });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, id, reason, review_id, report_id } = body;

    const supabase = isSupabaseConfigured() ? getSupabaseAdminClient() : null;

    if (action === "approve_realtor") {
      if (supabase) {
        await supabase.from("profiles").update({ status: "approved" }).eq("id", id);
      }
      const ok = approveRealtorApplication(id);
      return NextResponse.json({ success: ok });
    }

    if (action === "reject_realtor") {
      if (supabase) {
        await supabase.from("profiles").update({ status: "rejected" }).eq("id", id);
      }
      const ok = rejectRealtorApplication(id, reason);
      return NextResponse.json({ success: ok });
    }

    if (action === "toggle_vip") {
      if (supabase) {
        const { data: cur } = await supabase.from("listings").select("is_vip").eq("id", id).maybeSingle();
        const nextVip = !cur?.is_vip;
        await supabase.from("listings").update({ is_vip: nextVip }).eq("id", id);
        return NextResponse.json({ success: true, is_vip: nextVip });
      }
      const nextVip = toggleListingVipStatus(id);
      return NextResponse.json({ success: true, is_vip: nextVip });
    }

    if (action === "delete_listing") {
      if (supabase) {
        await supabase.from("listings").delete().eq("id", id);
      }
      const ok = deleteListingById(id);
      return NextResponse.json({ success: ok });
    }

    // Rəy Şikayətlərinin İdarə Olunması: Gizlət (Hide Review)
    if (action === "hide_review") {
      const targetRevId = review_id || id;
      if (supabase && targetRevId) {
        await supabase.from("realtor_reviews").update({ is_hidden: true }).eq("id", Number(targetRevId));
        if (report_id) {
          await supabase.from("review_reports").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", Number(report_id));
        }
      }
      return NextResponse.json({ success: true, message: "Rəy gizlədildi." });
    }

    // Rəy Şikayətlərinin İdarə Olunması: Sil (Delete Review)
    if (action === "delete_review") {
      const targetRevId = review_id || id;
      if (supabase && targetRevId) {
        await supabase.from("realtor_reviews").delete().eq("id", Number(targetRevId));
      }
      return NextResponse.json({ success: true, message: "Rəy tamamilə silindi." });
    }

    // Şikayəti rədd et / təmizlə (Dismiss Report)
    if (action === "dismiss_review_report") {
      const targetRepId = report_id || id;
      if (supabase && targetRepId) {
        await supabase.from("review_reports").update({ status: "dismissed" }).eq("id", Number(targetRepId));
        if (review_id) {
          await supabase.from("realtor_reviews").update({ is_reported: false }).eq("id", Number(review_id));
        }
      }
      return NextResponse.json({ success: true, message: "Şikayət əsassız hesab edildi və rədd olundu." });
    }

    if (action === "dismiss_report") {
      const ok = dismissReportById(id);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ success: false, message: "Bilinməyən əməliyyat" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
