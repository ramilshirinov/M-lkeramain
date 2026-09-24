import { NextResponse } from "next/server";
import { startLiveStreamSession } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";
import { ensureLiveKitRoom, isLiveKitConfigured } from "@/lib/livekit";

/**
 * POST /api/live/start
 * Realtorların sayt üzərindən canlı yayım və ya PK Arenası açması.
 * Real Supabase konfiqurasiya edilibsə live_streams (+ is_pk true olduqda pk_matches)
 * cədvəllərinə yazır və real LiveKit otağı yaradır. Əks halda yerli demo backend-ə keçir.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const {
      hostId = "r1",
      title = "Canlı Əmlak Təqdimatı & PK Arenası",
      description = "MÜLKERA Canlı Yayım sessiyası",
      isPk = true,
      rivalId,
      leftPropertyId,
      rightPropertyId,
    } = body;

    const roomName = `mulkera-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    if (isLiveKitConfigured()) {
      await ensureLiveKitRoom(roomName);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
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

        if (error) throw error;

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
          message: "Canlı yayım otağı uğurla başladıldı və LiveKit kanalı aktivdir.",
          streamId: stream.id,
          roomName: stream.room_name,
          webrtc: { room_name: stream.room_name, provider: "livekit" },
          stream,
          pkMatch,
          liveKitConfigured: isLiveKitConfigured(),
        });
      } catch (sbErr) {
        console.warn("Supabase live start fallback (demo backend istifadə olunur):", sbErr.message);
      }
    }

    // Demo/yerli fallback (Supabase konfiqurasiya edilməyibsə)
    const stream = startLiveStreamSession({
      hostId,
      title,
      description,
      isPk,
      rivalId,
      leftPropertyId,
      rightPropertyId,
    });
    stream.room_name = stream.room_name || roomName;

    return NextResponse.json({
      success: true,
      message: "Canlı yayım otağı (demo rejim) başladıldı.",
      streamId: stream.id,
      roomName: stream.webrtc?.room_name || roomName,
      webrtc: stream.webrtc,
      stream,
      liveKitConfigured: isLiveKitConfigured(),
    });
  } catch (error) {
    console.error("Canlı yayım başlatma xətası:", error);
    return NextResponse.json(
      { success: false, error: "Canlı yayım sessiyasını başladarkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
