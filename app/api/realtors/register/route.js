import { NextResponse } from "next/server";
import { registerRealtorDirect } from "@/lib/backend/db";

/**
 * POST /api/realtors/register
 * İstifadəçi qeydiyyatdan keçərkən rolun "Realtor" seçilməsi ilə
 * avtomatik realtors bazasına əlavə olunması və ilkin göstəricilərin təyini.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const { email, password, fullName, phone, agencyName, commissionRate, legalStatus, bio, avatarUrl } = body;

    if (!email || !fullName) {
      return NextResponse.json(
        { success: false, error: "Ad, soyad və email ünvanı tələb olunur." },
        { status: 400 }
      );
    }

    const newRealtor = registerRealtorDirect({
      email,
      password: password || "password123",
      fullName,
      phone: phone || "+994 50 111 22 33",
      agencyName: agencyName || "MÜLKERA Müstəqil Rieltoru",
      commissionRate: commissionRate || "1.5%",
      legalStatus: legalStatus || "VÖEN: Təsdiqlənmiş Rieltor",
      bio: bio || "MÜLKERA platformasında lisenziyalı daşınmaz əmlak mütəxəssisi.",
      avatarUrl
    });

    return NextResponse.json({
      success: true,
      message: "Rieltor hesabı uğurla yaradıldı və təsdiqləndi.",
      data: newRealtor
    });
  } catch (error) {
    console.error("Rieltor qeydiyyat xətası:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Rieltor qeydiyyatı zamanı xəta baş verdi." },
      { status: 400 }
    );
  }
}
