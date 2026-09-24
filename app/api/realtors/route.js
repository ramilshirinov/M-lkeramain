import { NextResponse } from "next/server";
import { getRankedRealtors, REALTOR_PACKAGES, VIP_PACKAGES, registerNewUser } from "@/lib/backend/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "rating";
    const realtors = getRankedRealtors(sort);
    return NextResponse.json({
      success: true,
      data: realtors,
      realtorPackages: REALTOR_PACKAGES,
      vipPackages: VIP_PACKAGES
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const newUser = registerNewUser({ ...body, role: "realtor" });
    return NextResponse.json({
      success: true,
      message: "Rieltor kimi uğurla qeydiyyatdan keçdiniz! Profiliniz sistemə əlavə olundu.",
      data: newUser
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}

