import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { AZERBAIJAN_REGIONS } from "@/constants/locations";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { data: dbDistricts, error } = await sb.from("districts").select("*").order("name");
    if (!error && dbDistricts && dbDistricts.length > 0) {
      return NextResponse.json({ success: true, data: dbDistricts });
    }
  } catch (e) {
    console.error("Districts fetch error:", e);
  }

  // Fallback to districts from AZERBAIJAN_REGIONS
  const allDistricts = AZERBAIJAN_REGIONS.flatMap((region) =>
    (region.districts || []).map((d, idx) => ({
      id: d.id || idx + 1,
      name: d.name,
      name_az: d.name,
      region_name: region.name,
      settlements: d.settlements || [],
    }))
  );

  return NextResponse.json({ success: true, data: allDistricts });
}
