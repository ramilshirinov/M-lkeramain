import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const sb = getSupabaseAdmin();
    const { data: profile, error } = await sb
      .from("public_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ success: false, error: "İstifadəçi tapılmadı." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("User profile error:", error);
    return NextResponse.json(
      { success: false, error: "Profil məlumatlarını əldə edərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
