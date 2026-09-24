import { NextResponse } from "next/server";
import { getUserListingsPaginated, getUserOrRealtorProfile } from "@/lib/backend/db";

/**
 * GET /api/users/:id/listings
 * Həmin şəxsin aktiv paylaşdığı bütün elanları səhifələmə (pagination) ilə siyahılayır.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const user = getUserOrRealtorProfile(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "İstifadəçi tapılmadı." },
        { status: 404 }
      );
    }

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Number(searchParams.get("limit") || 6));
    const status = searchParams.get("status") || "active";
    const type = searchParams.get("type") || "all";

    const result = getUserListingsPaginated(id, { page, limit, status, type });

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      },
      user: {
        id: user.id,
        full_name: user.full_name,
        agency_name: user.agency_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error("İstifadəçi elanları xətası:", error);
    return NextResponse.json(
      { success: false, error: "İstifadəçi elanlarını yükləyərkən xəta baş verdi." },
      { status: 500 }
    );
  }
}
