import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { streamId, participantId, participantName, role = "viewer" } = body;

    if (!streamId) {
      return NextResponse.json({ success: false, error: "streamId parametri tələb olunur." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: stream, error: streamErr } = await supabase
      .from("live_streams")
      .select("*")
      .eq("id", streamId)
      .maybeSingle();

    if (streamErr || !stream) {
      return NextResponse.json({ success: false, error: "Göstərilən canlı yayım sessiyası tapılmadı." }, { status: 404 });
    }

    await supabase.from("live_participants").insert([
      {
        stream_id: streamId,
        participant_id: participantId || null,
        participant_name: participantName || "Qonaq",
        role,
      },
    ]);

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
      stream: {
        ...stream,
        viewers_count: role === "viewer" ? (stream.viewers_count || 0) + 1 : stream.viewers_count,
      },
    });
  } catch (error) {
    console.error("Live join error:", error);
    return NextResponse.json({ success: false, error: "Yayıma qoşularkən xəta baş verdi." }, { status: 500 });
  }
}
