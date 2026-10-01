import { NextResponse } from "next/server";
import { AZERBAIJAN_REGIONS } from "@/constants/locations";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get("city");
    const districtId = searchParams.get("district");

    const allDistricts = AZERBAIJAN_REGIONS.flatMap((region) =>
      (region.districts || []).map((d) => ({
        ...d,
        regionId: region.id,
        regionName: region.name,
      }))
    );

    if (cityId) {
      const city = AZERBAIJAN_REGIONS.find(
        (c) => c.id.toLowerCase() === cityId.toLowerCase() || c.name.toLowerCase() === cityId.toLowerCase()
      );
      if (!city) {
        return NextResponse.json({ success: false, error: "Şəhər tapılmadı" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: city });
    }

    if (districtId) {
      const district = allDistricts.find(
        (d) => String(d.id).toLowerCase() === String(districtId).toLowerCase()
      );
      if (!district) {
        return NextResponse.json({ success: false, error: "Rayon tapılmadı" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: district });
    }

    return NextResponse.json({
      success: true,
      data: {
        cities: AZERBAIJAN_REGIONS,
        all_districts: allDistricts,
      },
    });
  } catch (error) {
    console.error("Hierarchy error:", error);
    return NextResponse.json(
      { success: false, error: "Məkan iyerarxiyasını yükləyərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
