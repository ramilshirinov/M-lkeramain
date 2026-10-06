import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_MASTER_PASS = process.env.ADMIN_MASTER_PASSWORD || "Mulkera2026";

export async function GET(req) {
  try {
    // 1. Cookie yoxlayırıq (master passcode sessiyası)
    const adminSessionCookie = req.cookies.get("mulkera_admin_session")?.value;
    if (adminSessionCookie === "authorized_admin_access") {
      return NextResponse.json({ success: true, isAdmin: true, method: "master_pass" });
    }

    // 2. Supabase auth yoxlayırıq
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (user) {
      const admin = getSupabaseAdmin();
      const { data: profile } = await admin
        .from("profiles")
        .select("role, email, full_name")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        return NextResponse.json({
          success: true,
          isAdmin: true,
          method: "supabase_role",
          user: { id: user.id, email: user.email, name: profile.full_name },
        });
      }
    }

    return NextResponse.json({ success: false, isAdmin: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, isAdmin: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { password } = await req.json();

    if (password && password === ADMIN_MASTER_PASS) {
      const res = NextResponse.json({ success: true, message: "Admin girişi uğurlu oldu" });
      res.cookies.set("mulkera_admin_session", "authorized_admin_access", {
        path: "/",
        httpOnly: true,
        maxAge: 86400 * 7, // 7 gün
        sameSite: "lax",
      });
      return res;
    }

    return NextResponse.json({ success: false, message: "Daxil edilmiş admin parolu yanlışdır" }, { status: 403 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: "Admin sessiyasından çıxıldı" });
  res.cookies.delete("mulkera_admin_session");
  return res;
}
