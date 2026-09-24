import { NextResponse } from "next/server";
import {
  getLiveStreams,
  getLiveStreamById,
  sendGiftToStream,
  addStreamComment,
  votePkStream,
  createLiveStream,
} from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";
import { enrichLiveStreamRow, enrichLiveStreamRows } from "@/lib/backend/liveEnrich";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status") || "active";

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();

        if (id) {
          const { data: stream, error } = await supabase
            .from("live_streams")
            .select("*, live_comments(*)")
            .eq("id", id)
            .single();
          if (error || !stream) throw error || new Error("not-found");
          const enriched = await enrichLiveStreamRow(supabase, stream);
          return NextResponse.json({ success: true, data: enriched });
        }

        let query = supabase.from("live_streams").select("*, live_comments(*)");
        if (status && status !== "all") query = query.eq("status", status);
        query = query.order("viewers_count", { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        const mapped = await enrichLiveStreamRows(supabase, data);
        return NextResponse.json({ success: true, data: mapped });
      } catch (sbErr) {
        console.warn("Supabase live GET fallback:", sbErr.message);
      }
    }

    if (id) {
      const stream = getLiveStreamById(id);
      if (!stream) {
        return NextResponse.json({ success: false, message: "Canlı yayım tapılmadı" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: stream });
    }

    const streams = getLiveStreams();
    return NextResponse.json({ success: true, data: streams });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, streamId, ...payload } = body;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();

        if (action === "comment") {
          if (!streamId) throw new Error("streamId tələb olunur");
          const { data, error } = await supabase
            .from("live_comments")
            .insert([{ stream_id: streamId, sender_id: payload.senderId || null, sender_name: payload.senderName || "Qonaq", text: payload.text }])
            .select()
            .single();
          if (error) throw error;
          return NextResponse.json({ success: true, data });
        }

        if (action === "vote") {
          if (!streamId) throw new Error("streamId tələb olunur");
          const side = payload.side === "right" ? "right" : "left";
          const column = side === "left" ? "left_score" : "right_score";
          const { data: current, error: curErr } = await supabase
            .from("live_streams")
            .select(column)
            .eq("id", streamId)
            .single();
          if (curErr) throw curErr;
          const { data, error } = await supabase
            .from("live_streams")
            .update({ [column]: (current?.[column] || 0) + 1 })
            .eq("id", streamId)
            .select()
            .single();
          if (error) throw error;
          return NextResponse.json({ success: true, data });
        }

        if (action === "gift") {
          // Zəhmət olmasa /api/live/gift marşrutundan istifadə edin (PK trigger dəstəyi ilə)
          const result = sendGiftToStream(streamId, payload);
          return NextResponse.json({ success: !!result, data: result });
        }

        if (action === "create") {
          const { data, error } = await supabase.from("live_streams").insert([payload]).select().single();
          if (error) throw error;
          return NextResponse.json({ success: true, data });
        }
      } catch (sbErr) {
        console.warn("Supabase live POST fallback:", sbErr.message);
      }
    }

    if (action === "create") {
      const newStream = createLiveStream(payload);
      return NextResponse.json({ success: true, data: newStream });
    }

    if (!streamId) {
      return NextResponse.json({ success: false, message: "Canlı yayım ID tələb olunur" }, { status: 400 });
    }

    if (action === "gift") {
      const result = sendGiftToStream(streamId, payload);
      if (!result) return NextResponse.json({ success: false, message: "Yayım tapılmadı" }, { status: 404 });
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "comment") {
      const comment = addStreamComment(streamId, payload);
      if (!comment) return NextResponse.json({ success: false, message: "Yayım tapılmadı" }, { status: 404 });
      return NextResponse.json({ success: true, data: comment });
    }

    if (action === "vote") {
      const updated = votePkStream(streamId, payload.side || "left");
      if (!updated) return NextResponse.json({ success: false, message: "Yayım tapılmadı" }, { status: 404 });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, message: "Bilinməyən əməliyyat" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
