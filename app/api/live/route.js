import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status") || "active";

    const sb = getSupabaseAdmin();

    if (id) {
      const { data: stream, error } = await sb
        .from("live_streams")
        .select("*, live_comments(*)")
        .eq("id", id)
        .maybeSingle();

      if (error || !stream) {
        return NextResponse.json({ success: false, message: "Canlı yayım tapılmadı" }, { status: 404 });
      }

      // Enrich profiles
      const hostId = stream.host_id;
      const rivalId = stream.rival_id;
      const ids = [hostId, rivalId].filter(Boolean);
      const { data: profs } = ids.length
        ? await sb.from("public_profiles").select("*").in("id", ids)
        : { data: [] };

      const host = profs?.find((p) => p.id === hostId) || null;
      const rival = profs?.find((p) => p.id === rivalId) || null;

      return NextResponse.json({
        success: true,
        data: {
          ...stream,
          host,
          rival,
          comments: stream.live_comments || [],
        },
      });
    }

    let query = sb
      .from("live_streams")
      .select("*, live_comments(*)")
      .order("viewers_count", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: streams, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const allHostIds = [
      ...new Set((streams || []).flatMap((s) => [s.host_id, s.rival_id]).filter(Boolean)),
    ];
    const { data: profs } = allHostIds.length
      ? await sb.from("public_profiles").select("*").in("id", allHostIds)
      : { data: [] };
    const byId = Object.fromEntries((profs || []).map((p) => [p.id, p]));

    const mapped = (streams || []).map((s) => ({
      ...s,
      host: byId[s.host_id] || null,
      rival: byId[s.rival_id] || null,
      comments: s.live_comments || [],
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, streamId, ...payload } = body;
    const sb = getSupabaseAdmin();

    if (action === "comment") {
      if (!streamId) {
        return NextResponse.json({ success: false, message: "streamId tələb olunur" }, { status: 400 });
      }
      const { data, error } = await sb
        .from("live_comments")
        .insert([
          {
            stream_id: streamId,
            sender_id: payload.senderId || null,
            sender_name: payload.senderName || "Qonaq",
            text: payload.text || "",
          },
        ])
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, data });
    }

    if (action === "vote") {
      if (!streamId) {
        return NextResponse.json({ success: false, message: "streamId tələb olunur" }, { status: 400 });
      }
      const side = payload.side === "right" ? "right" : "left";
      const column = side === "left" ? "left_score" : "right_score";
      const { data: current } = await sb
        .from("live_streams")
        .select(column)
        .eq("id", streamId)
        .maybeSingle();

      const { data, error } = await sb
        .from("live_streams")
        .update({ [column]: (current?.[column] || 0) + 1 })
        .eq("id", streamId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, data });
    }

    if (action === "create") {
      const { data, error } = await sb.from("live_streams").insert([payload]).select().single();
      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, message: "Bilinməyən əməliyyat" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
