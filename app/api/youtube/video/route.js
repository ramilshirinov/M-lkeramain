import { NextResponse } from "next/server";
import { route, requireUser, HttpError } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { purgeVideos, VIDEO_ID_RE } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = route(async (req) => {
  const { user } = await requireUser();
  const { videoId } = await req.json().catch(() => ({}));
  if (!VIDEO_ID_RE.test(videoId || "")) throw new HttpError(400, "invalid_file");

  const admin = getSupabaseAdmin();
  const { data: row } = await admin
    .from("youtube_uploads")
    .select("id,status")
    .eq("video_id", videoId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!row) throw new HttpError(404, "upload_not_found");
  if (row.status === "deleted") return NextResponse.json({ success: true, data: {} });

  const [r] = await purgeVideos([videoId]);
  if (r?.skipped === "in_use") throw new HttpError(409, "video_in_use");
  if (r?.error) throw new HttpError(502, "youtube_error");
  return NextResponse.json({ success: true, data: {} });
});
