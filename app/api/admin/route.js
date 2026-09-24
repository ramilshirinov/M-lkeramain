import { NextResponse } from "next/server";
import {
  getAdminDashboardData,
  approveRealtorApplication,
  rejectRealtorApplication,
  toggleListingVipStatus,
  deleteListingById,
  dismissReportById,
} from "@/lib/backend/db";

export async function GET() {
  try {
    const data = getAdminDashboardData();
    return NextResponse.json({ success: true, ...data });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, id, reason } = body;

    if (action === "approve_realtor") {
      const ok = approveRealtorApplication(id);
      return NextResponse.json({ success: ok });
    }

    if (action === "reject_realtor") {
      const ok = rejectRealtorApplication(id, reason);
      return NextResponse.json({ success: ok });
    }

    if (action === "toggle_vip") {
      const nextVip = toggleListingVipStatus(id);
      return NextResponse.json({ success: true, is_vip: nextVip });
    }

    if (action === "delete_listing") {
      const ok = deleteListingById(id);
      return NextResponse.json({ success: ok });
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
