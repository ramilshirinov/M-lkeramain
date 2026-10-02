import { NextResponse } from "next/server";
import { route, requireUser, HttpError } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createResumableSession, ytConfigured, limits, uploadTag } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const { user } = await requireUser();
  if (!ytConfigured()) throw new HttpError(503, "youtube_not_configured");

  const origin = req.headers.get("origin") || "";
  if (!limits.allowedOrigins().includes(origin)) throw new HttpError(403, "origin_not_allowed");

  const body = await req.json().catch(() => ({}));
  const fileName = String(body.fileName || "video").slice(0, 120);
  const fileSize = Number(body.fileSize);
  const mimeType = String(body.mimeType || "");

  if (!Number.isFinite(fileSize) || fileSize <= 0 || !/^video\//.test(mimeType)) {
    throw new HttpError(400, "invalid_file");
  }
  if (fileSize > limits.maxBytes()) throw new HttpError(400, "file_too_large");

  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const { count: mine } = await admin
    .from("youtube_uploads")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .gte("created_at", since)
    .neq("status", "failed");
  if ((mine ?? 0) >= limits.userDaily()) throw new HttpError(429, "rate_limited");

  const { count: all } = await admin
    .from("youtube_uploads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .neq("status", "failed");
  if ((all ?? 0) >= limits.globalDaily()) throw new HttpError(429, "rate_limited");

  const { data: row, error } = await admin
    .from("youtube_uploads")
    .insert({ owner_id: user.id, file_name: fileName, file_size: fileSize, mime_type: mimeType })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  try {
    const uploadUrl = await createResumableSession({
      fileSize,
      mimeType,
      title: `Mülkera elan videosu ${row.id.slice(0, 8)}`,
      description: "mulkera.az elan videosu",
      tags: [uploadTag(row.id), "mulkera"],
      origin,
    });
    return NextResponse.json({
      success: true,
      data: { uploadId: row.id, uploadUrl, chunkSize: limits.chunkSize, maxBytes: limits.maxBytes() },
    });
  } catch (e) {
    await admin
      .from("youtube_uploads")
      .update({ status: "failed", last_error: String(e.message).slice(0, 300) })
      .eq("id", row.id);
    console.error("[youtube] init failed:", e.status, e.detail || e.message);
    throw new HttpError(502, "youtube_error");
  }
});
