import { NextResponse } from "next/server";
import { getDb } from "@/lib/backend/db";
import { getAllDistrictsWithSettlements } from "@/lib/backend/locations";

export async function GET() {
  const db = getDb();
  const hierarchicalDistricts = getAllDistrictsWithSettlements();

  const enrichedDistricts = (db.districts || []).map((d) => {
    const matched = hierarchicalDistricts.find((hd) => String(hd.id) === String(d.id));
    return {
      ...d,
      settlements: matched?.settlements || [
        { id: `${d.id}-diger`, name: `Digər (${d.name_az})`, type: "digər" }
      ]
    };
  });

  return NextResponse.json({ success: true, data: enrichedDistricts });
}
