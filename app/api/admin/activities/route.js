import { NextResponse } from "next/server";
import { getRecentActivities, recordActivity } from "@/lib/activityLogger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 100);
    const filter = searchParams.get("filter") || "all";

    const logs = await getRecentActivities(limit, filter);

    return NextResponse.json({
      success: true,
      logs,
      totalCount: logs.length,
    });
  } catch (error) {
    console.error("[admin/activities] GET Xəta:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Bilinməyən Brauzer";

    const log = await recordActivity({
      action: body.action || "PAGE_VISIT",
      userId: body.userId,
      userEmail: body.userEmail,
      userName: body.userName,
      role: body.role,
      details: body.details || "Səhifə baxışı",
      ip: ip.split(",")[0].trim(),
      userAgent,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("[admin/activities] POST Xəta:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
