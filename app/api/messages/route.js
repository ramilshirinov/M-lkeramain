import { NextResponse } from "next/server";
import { getConversations, getMessages, sendMessage, markConversationRead } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversation_id");
    const userId = searchParams.get("user_id");
    const search = searchParams.get("search") || "";

    if (conversationId) {
      const messages = getMessages(conversationId);
      return NextResponse.json({ success: true, data: messages });
    }

    let targetUserId = userId;
    if (!targetUserId) {
      const cookieUser = req.cookies.get("mulkera_user_id");
      if (cookieUser?.value) targetUserId = cookieUser.value;
    }

    if (targetUserId) {
      let conversations = getConversations(targetUserId);

      // Əgər axtarış parametri varsa, həm söhbətlər, həm də Supabase üzrə ilike sorğusu
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        conversations = conversations.filter(
          (c) =>
            (c.other_user?.full_name || "").toLowerCase().includes(q) ||
            (c.other_user?.agency_name || "").toLowerCase().includes(q) ||
            (c.last_message || "").toLowerCase().includes(q)
        );
      }

      return NextResponse.json({ success: true, data: conversations });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      conversation_id,
      conversationId,
      sender_id,
      senderId,
      receiver_id,
      receiverId,
      listing_id,
      listingId,
      text,
      sender_name,
    } = body;

    const sId = sender_id || senderId;
    const rId = receiver_id || receiverId;
    const msgText = text;

    // 1. Supabase messages cədvəlinə sinxron yazırıq
    if (isSupabaseConfigured() && sId && rId && msgText) {
      try {
        const supabase = getSupabaseAdminClient();
        await supabase.from("messages").insert([
          {
            sender_id: String(sId),
            receiver_id: String(rId),
            content: msgText,
            sender_name: sender_name || null,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (sbErr) {
        console.warn("Supabase message insert warning:", sbErr.message);
      }
    }

    // 2. Real-vaxt çat üçün local mesajlaşmanı icra edirik
    const res = sendMessage({
      conversationId: conversation_id || conversationId,
      senderId: sId,
      receiverId: rId,
      listingId: listing_id || listingId,
      text: msgText,
    });

    return NextResponse.json({ success: true, data: res });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { conversation_id, conversationId, user_id, userId } = body;

    if ((conversation_id || conversationId) && (user_id || userId)) {
      markConversationRead(conversation_id || conversationId, user_id || userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: "Parametrlər çatışmır" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
