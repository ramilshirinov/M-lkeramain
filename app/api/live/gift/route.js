import { NextResponse } from "next/server";
import { sendGiftToStream } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";
import { enrichLiveStreamRow } from "@/lib/backend/liveEnrich";

/**
 * POST /api/live/gift
 * İzləyicinin PK otağına (və ya sadə canlı yayıma) hədiyyə göndərməsi.
 * Supabase konfiqurasiya edilibsə live_gifts-ə yazılır; DB trigger avtomatik
 * olaraq live_streams.left_score/right_score və pk_matches xalını artırır,
 * bütün izləyicilərə Supabase Realtime vasitəsilə anında yayımlanır.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      streamId,
      senderId = null,
      senderName = "İzləyici",
      giftId = "key",
      giftName = "Qızıl Açar",
      giftIcon = "🔑",
      price = 5,
      points = 50,
      targetSide = "left",
    } = body;

    if (!streamId) {
      return NextResponse.json({ success: false, error: "streamId parametri tələb olunur." }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();

        const { data: activeMatch } = await supabase
          .from("pk_matches")
          .select("id")
          .eq("stream_id", streamId)
          .eq("status", "active")
          .maybeSingle();

        const { data: gift, error } = await supabase
          .from("live_gifts")
          .insert([
            {
              stream_id: streamId,
              pk_match_id: activeMatch?.id || null,
              sender_id: senderId,
              sender_name: senderName,
              gift_id: giftId,
              gift_name: giftName,
              gift_icon: giftIcon,
              price,
              points,
              target_side: targetSide,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        const { data: streamRow } = await supabase.from("live_streams").select("*").eq("id", streamId).single();
        const stream = await enrichLiveStreamRow(supabase, streamRow);

        return NextResponse.json({
          success: true,
          message: `Hədiyyə (${giftName}) uğurla ${targetSide === "left" ? "Sol" : "Sağ"} tərəfə göndərildi!`,
          data: { gift, stream },
        });
      } catch (sbErr) {
        console.warn("Supabase gift fallback:", sbErr.message);
      }
    }

    const result = sendGiftToStream(streamId, { giftType: giftId, senderName, targetSide });
    if (!result) {
      return NextResponse.json({ success: false, error: "Canlı yayım otağı tapılmadı." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Hədiyyə (${result.gift.name}) uğurla ${targetSide === "left" ? "Sol" : "Sağ"} tərəfə göndərildi!`,
      data: result,
    });
  } catch (error) {
    console.error("Hədiyyə göndərmə xətası:", error);
    return NextResponse.json({ success: false, error: "Hədiyyə göndərilərkən xəta baş verdi." }, { status: 500 });
  }
}
