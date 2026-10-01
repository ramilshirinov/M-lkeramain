import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const revalidate = 60;

export async function GET(req) {
  try {
    const sp = new URL(req.url).searchParams;
    const ym = /^\d{4}-\d{2}$/.test(sp.get("period") || "")
      ? sp.get("period")
      : new Date().toISOString().slice(0, 7);
    const period = `${ym}-01`;
    const sb = getSupabaseAdmin();

    const { data: stats, error } = await sb
      .from("realtor_monthly_stats")
      .select("*")
      .eq("period", period);

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    const ids = (stats || []).map((s) => s.realtor_id);
    const { data: profs, error: e2 } = ids.length
      ? await sb.from("public_profiles").select("*").in("id", ids)
      : { data: [], error: null };
    if (e2) return NextResponse.json({ success: false, message: e2.message }, { status: 500 });

    const byId = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    let list = (stats || [])
      .filter((s) => byId[s.realtor_id])
      .map((s) => ({
        ...byId[s.realtor_id], // yalnız ictimai sütunlar
        sales_count: s.sales_count,
        sales_speed_days: s.sales_speed_days,
        active_listings: s.active_listings,
        reviews_count: s.reviews_count,
        avg_rating: s.avg_rating,
        score: Number(s.score),
        monthly_rank: s.monthly_rank,
      }));

    const area = (sp.get("area") || "").trim().toLocaleLowerCase("az");
    if (area) {
      list = list.filter((r) =>
        (r.service_areas || []).some((a) => a.toLocaleLowerCase("az").includes(area))
      );
    }

    const sort = sp.get("sortBy") || "score";
    const cmp = {
      score: (a, b) => (a.monthly_rank ?? 9e9) - (b.monthly_rank ?? 9e9) || b.score - a.score,
      sales: (a, b) => b.sales_count - a.sales_count,
      speed: (a, b) => (a.sales_speed_days ?? 9e9) - (b.sales_speed_days ?? 9e9),
      rating: (a, b) => (b.avg_rating ?? -1) - (a.avg_rating ?? -1),
    }[sort] || null;

    if (cmp) list.sort(cmp);

    const isFinal = (stats || []).length > 0 && (stats || []).every((s) => s.is_final);
    return NextResponse.json({
      success: true,
      period: ym,
      is_final: isFinal,
      data: list,
      total: list.length,
    });
  } catch (err) {
    console.error("Rankings GET error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
