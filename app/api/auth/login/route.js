import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email və şifrə daxil edilməlidir." }, { status: 400 });
    }

    const sbServer = await getSupabaseServer();
    const { data: signInData, error: signInErr } = await sbServer.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr || !signInData?.user) {
      return NextResponse.json(
        { success: false, message: "Email və ya şifrə yanlışdır." },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", signInData.user.id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      user: signInData.user,
      profile: profile || signInData.user,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Giriş zamanı xəta baş verdi." },
      { status: 500 }
    );
  }
}
