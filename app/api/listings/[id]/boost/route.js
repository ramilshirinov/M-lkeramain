import { NextResponse } from "next/server";
import { applyListingBoost, VIP_PACKAGES, getListingById } from "@/lib/backend/db";

/**
 * POST /api/listings/:id/boost
 * Elanı VIP statusuna yüksəltmək üçün ödəniş sistemi və abunəlik API strukturu
 * (Stripe / Birbank / PayTr inteqrasiyası üçün uyğunlaşdırılmış).
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const target = getListingById(id);
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Yüksəldiləcək elan tapılmadı." },
        { status: 404 }
      );
    }

    const {
      packageId = "vip-7",
      paymentMethod = "card",
      cardholderName = "Kart Sahibi",
      currency = "AZN"
    } = body;

    const result = applyListingBoost(id, {
      packageId,
      paymentMethod,
      cardholderName,
      currency
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: "VIP yüksəltmə əməliyyatı uğursuz oldu." },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("VIP boost xətası:", error);
    return NextResponse.json(
      { success: false, error: "Ödəniş emalı zamanı xəta baş verdi." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    packages: VIP_PACKAGES
  });
}
