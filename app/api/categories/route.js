import { NextResponse } from "next/server";
import { getDb } from "@/lib/backend/db";

export async function GET() {
  const db = getDb();
  return NextResponse.json({ success: true, data: db.categories || [] });
}
