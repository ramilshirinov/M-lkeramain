import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(req) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      try {
        const { recordActivity } = await import("@/lib/activityLogger");
        const ip = req?.headers?.get("x-forwarded-for") || req?.headers?.get("x-real-ip") || "127.0.0.1";
        const userAgent = req?.headers?.get("user-agent") || "";
        await recordActivity({
          action: "AUTH_LOGOUT",
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.email?.split("@")[0] || "İstifadəçi",
          role: user.user_metadata?.role || "customer",
          details: "İstifadəçi sistemdən çıxış etdi",
          ip: ip.split(",")[0].trim(),
          userAgent,
        });
      } catch {}
    }

    await supabase.auth.signOut();
  } catch (err) {
    console.error("SignOut error:", err);
  }

  return NextResponse.json({ success: true });
}
