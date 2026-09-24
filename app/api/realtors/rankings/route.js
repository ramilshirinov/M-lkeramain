import { NextResponse } from "next/server";
import { getRankedRealtors, runMonthlyRealtorRankingCalculation } from "@/lib/backend/db";

/**
 * GET /api/realtors/rankings
 * Realtorların reytinq cədvəlini və aylıq mükafatlarını qaytarır.
 *
 * POST /api/realtors/rankings
 * Hər ayın 1-də və ya avtomatik cron-job tərəfindən çağırılaraq
 * satışlar, elan sayları və rəylərə əsasən sıralamanı yenidən hesablayır.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "score";

    const ranked = getRankedRealtors(sortBy);

    return NextResponse.json({
      success: true,
      data: ranked,
      period: new Date().toISOString().slice(0, 7),
      total: ranked.length
    });
  } catch (error) {
    console.error("Reytinq cədvəli xətası:", error);
    return NextResponse.json(
      { success: false, error: "Reytinq məlumatları yüklənərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Cron trigger və ya admin hesablama əmri
    const updatedRankings = runMonthlyRealtorRankingCalculation();

    return NextResponse.json({
      success: true,
      message: "Aylıq rieltor reytinqi və mükafatları uğurla hesablandı!",
      period: new Date().toISOString().slice(0, 7),
      data: updatedRankings
    });
  } catch (error) {
    console.error("Reytinq hesablama xətası:", error);
    return NextResponse.json(
      { success: false, error: "Reytinq hesablanarkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
