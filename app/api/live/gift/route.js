import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

    const supabase = getSupabaseAdmin();

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

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const { data: streamRow } = await supabase
      .from("live_streams")
      .select("*")
      .eq("id", streamId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      message: `Hədiyyə (${giftName}) uğurla ${targetSide === "left" ? "Sol" : "Sağ"} tərəfə göndərildi!`,
      data: { gift, stream: streamRow },
    });
  } catch (error) {
    console.error("Live gift error:", error);
    return NextResponse.json({ success: false, error: "Hədiyyə göndərilərkən xəta baş verdi." }, { status: 500 });
  }
}
