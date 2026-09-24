import { NextResponse } from "next/server";
import { updateUserProfileById, getUserProfileById } from "@/lib/backend/db";

export async function PUT(req) {
  try {
    const body = await req.json();
    const userIdCookie = req.cookies.get("mulkera_user_id");
    const userId = body.userId || userIdCookie?.value;

    if (!userId) {
      return NextResponse.json({ success: false, message: "İstifadəçi tapılmadı." }, { status: 401 });
    }

    const updated = updateUserProfileById(userId, body);
    return NextResponse.json({ success: true, user: updated, profile: updated });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
