import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PROPERTY_CATEGORIES } from "@/constants/categories";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.from("categories").select("*").order("id");
    if (!error && data && data.length > 0) {
      return NextResponse.json({ success: true, data });
    }
  } catch (e) {
    console.error("Categories fetch error:", e);
  }
  return NextResponse.json({ success: true, data: PROPERTY_CATEGORIES });
}
