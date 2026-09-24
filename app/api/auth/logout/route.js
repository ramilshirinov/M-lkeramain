import { NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function POST() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseServerClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase signOut xətası:", err.message);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("mulkera_user_id");
  return response;
}
