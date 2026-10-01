import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureLiveKitRoom, isLiveKitConfigured } from "@/lib/livekit";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      hostId,
      title = "Canlı Əmlak Təqdimatı",
      description = "MÜLKERA Canlı Yayım",
      isPk = false,
      rivalId,
      leftPropertyId,
      rightPropertyId,
    } = body;

    if (!hostId) {
      return NextResponse.json({ success: false, message: "hostId tələb olunur" }, { status: 400 });
    }

    const roomName = `mulkera-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    if (isLiveKitConfigured()) {
      await ensureLiveKitRoom(roomName);
    }

    const supabase = getSupabaseAdmin();
    const { data: stream, error } = await supabase
      .from("live_streams")
      .insert([
        {
          room_name: roomName,
          host_id: hostId,
          rival_id: rivalId || null,
          title,
          description,
          is_pk: Boolean(isPk),
          left_listing_id: leftPropertyId || null,
          right_listing_id: rightPropertyId || null,
          status: "active",
          viewers_count: 1,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    let pkMatch = null;
    if (isPk) {
      const { data: match } = await supabase
        .from("pk_matches")
        .insert([
          {
            stream_id: stream.id,
            left_realtor_id: hostId,
            right_realtor_id: rivalId || null,
            status: "active",
          },
        ])
        .select()
        .single();
      pkMatch = match || null;
    }

    return NextResponse.json({
      success: true,
      message: "Canlı yayım otağı uğurla başladıldı.",
      streamId: stream.id,
      roomName: stream.room_name,
      webrtc: { room_name: stream.room_name, provider: "livekit" },
      stream,
      pkMatch,
      liveKitConfigured: isLiveKitConfigured(),
    });
  } catch (error) {
    console.error("Live start error:", error);
    return NextResponse.json(
      { success: false, error: "Canlı yayım sessiyasını başladarkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
