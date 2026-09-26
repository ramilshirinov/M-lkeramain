import { NextResponse } from "next/server";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";
import { getDb } from "@/lib/backend/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 1. Supabase Profiles cədvəlində ilike sorğusu
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, avatar_url, role, agency_name, service_areas")
          .or(`full_name.ilike.%${q}%,agency_name.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(20);

        if (!error && Array.isArray(data)) {
          return NextResponse.json({ success: true, data, source: "supabase" });
        }
      } catch (sbErr) {
        console.warn("Supabase user search warning:", sbErr.message);
      }
    }

    // 2. Fallback: local backend
    const db = getDb();
    const query = q.toLowerCase();
    const matches = (db.users || []).filter(
      (u) =>
        (u.full_name || "").toLowerCase().includes(query) ||
        (u.agency_name || "").toLowerCase().includes(query) ||
        (u.email || "").toLowerCase().includes(query)
    );

    return NextResponse.json({ success: true, data: matches, source: "local" });
  } catch (err) {
    console.error("User search error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
