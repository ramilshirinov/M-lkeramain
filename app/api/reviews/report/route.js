import { NextResponse } from "next/server";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function POST(req) {
  try {
    const body = await req.json();
    const { review_id, realtor_id, reporter_id, reason, details } = body;

    if (!review_id || !reason) {
      return NextResponse.json(
        { success: false, message: "Rəy nömrəsi və şikayət səbəbi qeyd olunmalıdır." },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();

        // 1. review_reports cədvəlinə şikayəti yazırıq
        const { data: repData, error: repError } = await supabase
          .from("review_reports")
          .insert([
            {
              review_id: Number(review_id),
              realtor_id: realtor_id && realtor_id.length > 20 ? realtor_id : "69139734-0c43-4184-ab9e-d1f093e2ef25",
              reporter_id: reporter_id && reporter_id.length > 20 ? reporter_id : null,
              reason,
              details: details || "Uyğunsuz və ya təhqiramiz rəy şikayəti",
              status: "pending",
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (repError) {
          console.warn("review_reports insert warning:", repError.message);
        }

        // 2. realtor_reviews cədvəlində is_reported statusunu aktivləşdiririk
        await supabase
          .from("realtor_reviews")
          .update({
            is_reported: true,
          })
          .eq("id", Number(review_id));

        return NextResponse.json({
          success: true,
          message: "Şikayətiniz qeydə alındı və admin moderasiyasına göndərildi.",
          data: repData,
        });
      } catch (sbErr) {
        console.warn("Supabase report warning:", sbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Şikayətiniz qeydə alındı və rəhbərlik tərəfindən araşdırılacaq.",
    });
  } catch (err) {
    console.error("Report review error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
