import { NextResponse } from "next/server";
import { getUserOrRealtorProfile } from "@/lib/backend/db";

/**
 * GET /api/users/:id
 * Realtorun və ya mülkiyyətçinin şəxsi məlumatlarını, komissiya faizini,
 * agentliyinin yerini, əlaqə vasitələrini və aktiv reytinqini qaytarır.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const profile = getUserOrRealtorProfile(id);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "İstifadəçi və ya rieltor tapılmadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error("İstifadəçi profil xətası:", error);
    return NextResponse.json(
      { success: false, error: "Profil məlumatlarını əldə edərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
