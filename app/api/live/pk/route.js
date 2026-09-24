import { NextResponse } from "next/server";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";
import { endLiveKitRoom } from "@/lib/livekit";

/**
 * GET /api/live/pk?streamId=...
 * Verilmiş yayımın aktiv PK matçını (xallar daxil) qaytarır.
 */
export async function GET(req) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: false, message: "Supabase konfiqurasiya edilməyib." }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const streamId = searchParams.get("streamId");
    if (!streamId) {
      return NextResponse.json({ success: false, message: "streamId tələb olunur" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("pk_matches")
      .select("*")
      .eq("stream_id", streamId)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ success: true, data: data || null });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * POST /api/live/pk
 * PK matçını bitirir, qalibi (sol/sağ/bərabərə) müəyyən edir, aylıq rieltor
 * xalına (realtor_monthly_stats) əlavə edir və yayımı sona çatdırır.
 * body: { streamId, matchId }
 */
export async function POST(req) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: false, message: "Supabase konfiqurasiya edilməyib." }, { status: 503 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { streamId, matchId } = body;
    if (!streamId) {
      return NextResponse.json({ success: false, message: "streamId tələb olunur" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { data: stream, error: streamErr } = await supabase
      .from("live_streams")
      .select("*")
      .eq("id", streamId)
      .single();
    if (streamErr || !stream) throw streamErr || new Error("Yayım tapılmadı");

    let match = null;
    if (matchId) {
      const { data } = await supabase.from("pk_matches").select("*").eq("id", matchId).single();
      match = data;
    } else {
      const { data } = await supabase
        .from("pk_matches")
        .select("*")
        .eq("stream_id", streamId)
        .eq("status", "active")
        .maybeSingle();
      match = data;
    }

    let winnerSide = "draw";
    if (stream.left_score > stream.right_score) winnerSide = "left";
    else if (stream.right_score > stream.left_score) winnerSide = "right";

    if (match) {
      await supabase
        .from("pk_matches")
        .update({ status: "finished", winner_side: winnerSide, finished_at: new Date().toISOString() })
        .eq("id", match.id);

      const winnerId = winnerSide === "left" ? match.left_realtor_id : winnerSide === "right" ? match.right_realtor_id : null;
      if (winnerId) {
        const period = new Date();
        period.setDate(1);
        const periodStr = period.toISOString().slice(0, 10);

        const { data: existing } = await supabase
          .from("realtor_monthly_stats")
          .select("*")
          .eq("realtor_id", winnerId)
          .eq("period", periodStr)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("realtor_monthly_stats")
            .update({
              pk_wins: (existing.pk_wins || 0) + 1,
              pk_points: (existing.pk_points || 0) + Math.max(stream.left_score, stream.right_score),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("realtor_monthly_stats").insert([
            {
              realtor_id: winnerId,
              period: periodStr,
              pk_wins: 1,
              pk_points: Math.max(stream.left_score, stream.right_score),
            },
          ]);
        }
      }
    }

    await supabase
      .from("live_streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", streamId);

    if (stream.room_name) {
      await endLiveKitRoom(stream.room_name);
    }

    return NextResponse.json({ success: true, winnerSide, match });
  } catch (err) {
    console.error("PK match bitirmə xətası:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
