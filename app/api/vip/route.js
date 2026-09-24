import { NextResponse } from "next/server";
import { VIP_PACKAGES, REALTOR_PACKAGES, applyVipPackage } from "@/lib/backend/db";

export async function GET() {
  return NextResponse.json({
    success: true,
    vipPackages: VIP_PACKAGES,
    realtorPackages: REALTOR_PACKAGES
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { listingId, packageId, paymentMethod } = body;

    if (!listingId) {
      return NextResponse.json({ success: false, message: "Elan ID tələb olunur" }, { status: 400 });
    }

    const result = applyVipPackage(listingId, packageId, paymentMethod || "card");
    if (!result) {
      return NextResponse.json({ success: false, message: "Elan tapılmadı" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Elanınız uğurla VIP statusuna yüksəldildi və ən ön sıraya yerləşdirildi!",
      ...result
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
