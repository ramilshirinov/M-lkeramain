import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { purgeVideos } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 });
  }
  const admin = getSupabaseAdmin();

  // 1) 24 saatdan çox "initiated" qalan sessiyalar → failed
  await admin
    .from("youtube_uploads")
    .update({ status: "failed", last_error: "stale_session" })
    .eq("status", "initiated")
    .lt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());

  // 2) Yetim videolar → YouTube-dan sil (hər çağırışda max 20; hər silmə 50 kvota vahididir)
  const { data: orphans, error } = await admin.rpc("youtube_orphans", {
    p_older_than: "6 hours",
    p_limit: 20,
  });
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  const results = await purgeVideos((orphans || []).map((o) => o.video_id));
  return NextResponse.json({ success: true, results });
}
