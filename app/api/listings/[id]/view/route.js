import { NextResponse } from "next/server";
import { incrementListingViewCount } from "@/lib/backend/db";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    incrementListingViewCount(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
