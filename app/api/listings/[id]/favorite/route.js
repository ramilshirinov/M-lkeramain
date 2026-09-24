import { NextResponse } from "next/server";
import { toggleListingFavorite, getDb } from "@/lib/backend/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const userIdCookie = req.cookies.get("mulkera_user_id");
    const userId = userIdCookie?.value;

    if (!userId) {
      return NextResponse.json({ favorited: false });
    }

    const db = getDb();
    const exists = db.favorites.some(
      (f) => String(f.user_id) === String(userId) && String(f.listing_id) === String(id)
    );

    return NextResponse.json({ favorited: exists });
  } catch (err) {
    return NextResponse.json({ favorited: false });
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const userIdCookie = req.cookies.get("mulkera_user_id");
    const userId = body.userId || userIdCookie?.value;

    if (!userId) {
      return NextResponse.json({ success: false, requiresAuth: true, message: "Giriş tələb olunur" }, { status: 401 });
    }

    const result = toggleListingFavorite(userId, id);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
