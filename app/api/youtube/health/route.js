import { NextResponse } from "next/server";
import { route, requireUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ytMissing } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const { user } = await requireUser();
  const missing = ytMissing();
  const data = { configured: missing.length === 0 };

  // Çatışan env adlarını yalnız admin görür
  const { data: p } = await getSupabaseAdmin()
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (p?.role === "admin") data.missing = missing;

  return NextResponse.json({ success: true, data });
});
