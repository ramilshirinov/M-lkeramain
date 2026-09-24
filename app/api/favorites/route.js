import { NextResponse } from "next/server";
import { getUserFavorites } from "@/lib/backend/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdCookie = req.cookies.get("mulkera_user_id");
    const userId = searchParams.get("userId") || userIdCookie?.value;

    if (!userId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const favs = getUserFavorites(userId);
    return NextResponse.json({ success: true, data: favs });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}
