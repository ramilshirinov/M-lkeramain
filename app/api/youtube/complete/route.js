import { NextResponse } from "next/server";
import { route, requireUser, HttpError } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getVideo, uploadTag, watchUrl, embedUrl, VIDEO_ID_RE, UUID_RE, clean } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getVideoWithRetry(id) {
  for (let i = 0; i < 4; i++) {
    const v = await getVideo(id);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

export const POST = route(async (req) => {
  const { user } = await requireUser();
  const { uploadId, videoId } = await req.json().catch(() => ({}));
  if (!UUID_RE.test(uploadId || "") || !VIDEO_ID_RE.test(videoId || "")) {
    throw new HttpError(400, "invalid_file");
  }

  const admin = getSupabaseAdmin();
  const { data: row } = await admin
    .from("youtube_uploads")
    .select("*")
    .eq("id", uploadId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!row) throw new HttpError(404, "upload_not_found");

  const ok = (privacyStatus = "unlisted") =>
    NextResponse.json({
      success: true,
      data: { uploadId, videoId, url: watchUrl(videoId), embedUrl: embedUrl(videoId), privacyStatus },
    });

  if (row.status === "uploaded" && row.video_id === videoId) return ok(); // idempotent
  if (row.status !== "initiated") throw new HttpError(409, "invalid_state");

  let video;
  try {
    video = await getVideoWithRetry(videoId);
  } catch (e) {
    console.error("[youtube] complete/list failed:", e.status, e.detail || e.message);
    throw new HttpError(502, "youtube_error");
  }
  if (!video) throw new HttpError(404, "video_not_found");

  // Video bu sessiyaya aiddirmi? (init-də qoyduğumuz gizli teq)
  if (!(video.snippet?.tags || []).includes(uploadTag(uploadId))) throw new HttpError(403, "forbidden");
  const channelId = clean(process.env.YOUTUBE_CHANNEL_ID);
  if (channelId && video.snippet?.channelId !== channelId) {
    throw new HttpError(403, "forbidden");
  }

  const privacy = video.status?.privacyStatus;
  if (privacy !== "unlisted") {
    console.error("[youtube] video unlisted deyil:", privacy, "→ API layihəsi auditdən keçməyib ola bilər.");
    await admin.from("youtube_uploads")
      .update({ status: "uploaded", video_id: videoId, uploaded_at: new Date().toISOString(), last_error: `privacy=${privacy}` })
      .eq("id", uploadId); // yetim sayılacaq, cron silər
    throw new HttpError(502, "youtube_not_unlisted");
  }

  await admin
    .from("youtube_uploads")
    .update({ status: "uploaded", video_id: videoId, uploaded_at: new Date().toISOString(), last_error: null })
    .eq("id", uploadId);

  return ok(privacy);
});
