import { NextResponse } from "next/server";
import { applyListingBoost, VIP_PACKAGES, getListingById } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const target = getListingById(id);

    const {
      packageId = "vip-7",
      paymentMethod = "card",
      cardholderName = "Kart Sahibi",
      currency = "AZN"
    } = body;

    // 1. Supabase-də is_vip sütununu true edirik
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        await supabase
          .from("listings")
          .update({ is_vip: true, updated_at: new Date().toISOString() })
          .eq("id", id);
      } catch (sbErr) {
        console.warn("Supabase VIP boost update fallback:", sbErr.message);
      }
    }

    // 2. Local DB
    const result = applyListingBoost(id, {
      packageId,
      paymentMethod,
      cardholderName,
      currency
    });

    return NextResponse.json(
      result || {
        success: true,
        message: "Elan VIP statusuna yüksəldildi!",
      }
    );
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
