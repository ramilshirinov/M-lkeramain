import { NextResponse } from "next/server";
import { createListingReport } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { reason, details, reporterId } = body;

    // 1. Supabase-ə şikayət əlavə edirik
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        await supabase.from("reports").insert([
          {
            listing_id: id,
            reporter_id: reporterId || null,
            reason: reason || "Digər",
            details: details || "",
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (sbErr) {
        console.warn("Supabase report insert fallback:", sbErr.message);
      }
    }

    // 2. Local DB
    const report = createListingReport({
      listingId: id,
      reporterId: reporterId || null,
      reason: reason || "Digər",
      details: details || "",
    });

    return NextResponse.json({ success: true, report });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
