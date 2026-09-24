import { NextResponse } from "next/server";
import { addLiveWaitingList } from "@/lib/backend/db";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, phone, role, note } = body;

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, message: "Email və ya əlaqə nömrəsi daxil edin." },
        { status: 400 }
      );
    }

    const entry = addLiveWaitingList({ email, phone, role, note });
    return NextResponse.json({
      success: true,
      message: "Təşəkkür edirik! Canlı yayım və PK sistemi aktivləşdikdə sizə bildiriş göndəriləcək.",
      data: entry,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
