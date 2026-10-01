import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, phone, role, note } = body;

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, message: "Email və ya əlaqə nömrəsi daxil edin." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: entry, error } = await supabase
      .from("waiting_list")
      .insert([
        {
          email: email || null,
          phone: phone || null,
          role: role || "buyer",
          note: note || "Canlı / AI Qeydiyyat",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Waiting list insert note:", error.message);
    }

    return NextResponse.json({
      success: true,
      message: "Təşəkkür edirik! Canlı yayım və PK sistemi aktivləşdikdə sizə bildiriş göndəriləcək.",
      data: entry || { email, phone, role, note },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
