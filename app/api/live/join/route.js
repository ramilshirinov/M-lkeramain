import { NextResponse } from "next/server";
import { joinLiveStreamSession } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

/**
 * POST /api/live/join
 * İzləyicinin (və ya PK rəqibinin) canlı otağa qoşulması.
 * viewers_count-u real vaxtda artırır (Supabase varsa) və iştirakçı qeydini yaradır.
 * Faktiki media tokeni /api/live/token marşrutundan ayrıca alınır.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { streamId, participantId, participantName, role = "viewer" } = body;

    if (!streamId) {
      return NextResponse.json({ success: false, error: "streamId parametri tələb olunur." }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();

        const { data: stream, error: streamErr } = await supabase
          .from("live_streams")
          .select("*")
          .eq("id", streamId)
          .single();

        if (streamErr || !stream) throw streamErr || new Error("not-found");

        await supabase
          .from("live_participants")
          .insert([{ stream_id: streamId, participant_id: participantId || null, participant_name: participantName || "Qonaq", role }]);

        if (role === "viewer") {
          await supabase
            .from("live_streams")
            .update({ viewers_count: (stream.viewers_count || 0) + 1 })
            .eq("id", streamId);
        }

        return NextResponse.json({
          success: true,
          message: "Canlı yayım otağına uğurla qoşuldunuz.",
          roomName: stream.room_name,
          stream: { ...stream, viewers_count: role === "viewer" ? (stream.viewers_count || 0) + 1 : stream.viewers_count },
        });
      } catch (sbErr) {
        console.warn("Supabase live join fallback:", sbErr.message);
      }
    }

    const result = joinLiveStreamSession(streamId, { participantId, participantName, role });
    if (!result) {
      return NextResponse.json({ success: false, error: "Göstərilən canlı yayım sessiyası tapılmadı." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Canlı yayım otağına uğurla qoşuldunuz.", ...result });
  } catch (error) {
    console.error("Canlı yayıma qoşulma xətası:", error);
    return NextResponse.json({ success: false, error: "Yayıma qoşularkən xəta baş verdi." }, { status: 500 });
  }
}
