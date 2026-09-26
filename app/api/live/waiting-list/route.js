import { NextResponse } from "next/server";
import { addLiveWaitingList } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

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

    // 1. Supabase-ə yazmaq
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        await supabase.from("waiting_list").insert([
          {
            email: email || null,
            phone: phone || null,
            role: role || "buyer",
            note: note || "Canlı / AI Qeydiyyat",
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (sbErr) {
        console.warn("Supabase waiting_list insert fallback:", sbErr.message);
      }
    }

    // 2. Local Database
    const entry = addLiveWaitingList({ email, phone, role, note });

    return NextResponse.json({
      success: true,
      message: "Təşəkkür edirik! Canlı yayım və PK sistemi aktivləşdikdə sizə bildiriş göndəriləcək.",
      data: entry,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
