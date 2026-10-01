import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await getSupabaseServer();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("SignOut error:", err);
  }

  return NextResponse.json({ success: true });
}
