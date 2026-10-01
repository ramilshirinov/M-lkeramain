import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";

export async function POST(req) {
  try {
    const { user, sb } = await requireUser();
    const body = await req.json();
    const { review_id, realtor_id, reason, details } = body;

    if (!review_id || !reason) {
      return NextResponse.json(
        { success: false, message: "Rəy nömrəsi və şikayət səbəbi qeyd olunmalıdır." },
        { status: 400 }
      );
    }

    const { data: repData, error: repError } = await sb
      .from("review_reports")
      .insert([
        {
          review_id: Number(review_id),
          realtor_id: realtor_id || null,
          reporter_id: user.id,
          reason,
          details: details || "",
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (repError) {
      return NextResponse.json({ success: false, message: repError.message }, { status: 400 });
    }

    await sb
      .from("realtor_reviews")
      .update({ is_reported: true })
      .eq("id", Number(review_id));

    return NextResponse.json({
      success: true,
      message: "Şikayətiniz qeydə alındı.",
      data: repData,
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: err.status || 500 });
  }
}
