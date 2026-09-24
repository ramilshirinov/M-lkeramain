import { NextResponse } from "next/server";
import { HIERARCHICAL_LOCATIONS, getAllDistrictsWithSettlements } from "@/lib/backend/locations";

/**
 * GET /api/locations/hierarchy
 * Bütün şəhər, rayon, qəsəbə, mikrorayon və kəndlərin iyerarxik məlumat bazası
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get("city");
    const districtId = searchParams.get("district");

    if (cityId) {
      const city = HIERARCHICAL_LOCATIONS.cities.find((c) => c.id === cityId);
      if (!city) {
        return NextResponse.json({ success: false, error: "Şəhər tapılmadı" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: city });
    }

    if (districtId) {
      const districts = getAllDistrictsWithSettlements();
      const district = districts.find((d) => String(d.id) === String(districtId));
      if (!district) {
        return NextResponse.json({ success: false, error: "Rayon tapılmadı" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: district });
    }

    return NextResponse.json({
      success: true,
      data: {
        cities: HIERARCHICAL_LOCATIONS.cities,
        all_districts: getAllDistrictsWithSettlements()
      }
    });
  } catch (error) {
    console.error("İyerarxiya xətası:", error);
    return NextResponse.json(
      { success: false, error: "Məkan iyerarxiyasını yükləyərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
