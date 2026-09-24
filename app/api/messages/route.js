import { NextResponse } from "next/server";
import { getConversations, getMessages, sendMessage, markConversationRead } from "@/lib/backend/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversation_id");
    const userId = searchParams.get("user_id");

    if (conversationId) {
      const messages = getMessages(conversationId);
      return NextResponse.json({ success: true, data: messages });
    }

    if (userId) {
      const conversations = getConversations(userId);
      return NextResponse.json({ success: true, data: conversations });
    }

    // Default: Check cookie if present
    const cookieUser = req.cookies.get("mulkera_user_id");
    if (cookieUser?.value) {
      const conversations = getConversations(cookieUser.value);
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
    const { conversation_id, conversationId, sender_id, senderId, receiver_id, receiverId, listing_id, listingId, text } = body;

    const res = sendMessage({
      conversationId: conversation_id || conversationId,
      senderId: sender_id || senderId,
      receiverId: receiver_id || receiverId,
      listingId: listing_id || listingId,
      text,
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
