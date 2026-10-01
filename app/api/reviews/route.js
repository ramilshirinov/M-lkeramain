import { NextResponse } from "next/server";
import { 
  getListingReviews, 
  addListingReview, 
  addRealtorReview, 
  likeListingReview, 
  replyListingReview, 
  reportListingReview,
  getDb 
} from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("listing_id");
    const realtorId = searchParams.get("realtor_id");

    // 1. Supabase-dən oxumaq
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();

        // A. Spesifik elanın rəyləri (hər elanın rəyi ayrı)
        if (listingId) {
          const { data, error } = await supabase
            .from("reviews")
            .select("*")
            .eq("listing_id", listingId)
            .order("created_at", { ascending: false });

          if (!error && Array.isArray(data) && data.length > 0) {
            const count = data.length;
            const avg = Number((data.reduce((sum, r) => sum + Number(r.rating || 5), 0) / count).toFixed(1));
            return NextResponse.json({
              success: true,
              reviews: data,
              count,
              averageRating: avg,
              source: "supabase",
            });
          }
        }

        // B. Rieltor rəyləri
        if (realtorId) {
          let query = supabase
            .from("realtor_reviews")
            .select("*")
            .eq("is_hidden", false)
            .order("created_at", { ascending: false });

          if (realtorId === "u-1790232121053" || realtorId === "69139734-0c43-4184-ab9e-d1f093e2ef25") {
            query = query.or(`realtor_id.eq.${realtorId},realtor_id.eq.69139734-0c43-4184-ab9e-d1f093e2ef25`);
          } else {
            query = query.eq("realtor_id", realtorId);
          }

          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            const count = data.length;
            const avg =
              count > 0
                ? Number((data.reduce((sum, r) => sum + Number(r.rating || 5), 0) / count).toFixed(1))
                : 5.0;

            const formatted = data.map((r) => ({
              id: r.id,
              author_name: r.reviewer_name || "Müştəri",
              rating: r.rating,
              comment: r.comment,
              is_reported: !!r.is_reported,
              date: r.created_at ? new Date(r.created_at).toLocaleDateString("az-AZ") : "Bu gün",
              created_at: r.created_at,
            }));

            return NextResponse.json({
              success: true,
              reviews: formatted,
              count,
              averageRating: avg,
              source: "supabase",
            });
          }
        }
      } catch (sbErr) {
        console.warn("Supabase reviews read warning:", sbErr.message);
      }
    }

    // 2. Fallback: local backend DB
    const db = getDb();
    if (listingId) {
      const data = getListingReviews(listingId);
      return NextResponse.json({ success: true, ...data, source: "local" });
    }

    if (realtorId) {
      const reviews = (db.reviews || []).filter((r) => String(r.realtor_id) === String(realtorId));
      const avg =
        reviews.length > 0
          ? Number((reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / reviews.length).toFixed(1))
          : 5.0;
      return NextResponse.json({ success: true, reviews, count: reviews.length, averageRating: avg, source: "local" });
    }

    return NextResponse.json({ success: true, reviews: db.reviews || [], count: (db.reviews || []).length });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, review_id, listing_id, realtor_id, rating, comment, reviewer_name, user_id, reason } = body;

    // 1. Like əməliyyatı
    if (action === "like" && review_id) {
      const updated = likeListingReview(review_id);
      return NextResponse.json({ success: true, data: updated, message: "Rəy bəyənildi!" });
    }

    // 2. Rəyə rəy yazma (Reply to review)
    if (action === "reply" && review_id) {
      if (!comment || !comment.trim()) {
        return NextResponse.json({ success: false, message: "Cavab mətni boş ola bilməz." }, { status: 400 });
      }
      const newReply = replyListingReview({
        reviewId: review_id,
        author_name: reviewer_name,
        comment: comment.trim(),
        user_id,
      });
      return NextResponse.json({ success: true, data: newReply, message: "Cavabınız əlavə edildi!" });
    }

    // 3. Bildirmə / Şikayət əməliyyatı (Report review)
    if (action === "report" && review_id) {
      const reported = reportListingReview(review_id, reason || "Uyğunsuz məzmun");
      return NextResponse.json({ success: true, data: reported, message: "Şikayətiniz adminə göndərildi." });
    }

    // 4. Yeni Rəy Əlavə Etmə
    if (!rating || !comment) {
      return NextResponse.json({ success: false, message: "Reytinq və rəy mətni məcburidir." }, { status: 400 });
    }

    // A. Elana rəy yazılması (listing_id ilə izolyasiya olunur)
    if (listing_id) {
      let createdSbReview = null;
      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdminClient();
          const { data, error } = await supabase
            .from("reviews")
            .insert([
              {
                listing_id: Number(listing_id) || listing_id,
                author_name: reviewer_name || "Müştəri",
                user_id: user_id && user_id.length > 20 ? user_id : null,
                rating: Number(rating),
                comment: comment.trim(),
                created_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (!error && data) {
            createdSbReview = data;
          }
        } catch (sbErr) {
          console.warn("Supabase listing review insert failed:", sbErr.message);
        }
      }

      const localReview = addListingReview({
        listingId: listing_id,
        reviewer_name,
        reviewer_id: user_id,
        rating,
        comment,
      });

      return NextResponse.json({ 
        success: true, 
        data: createdSbReview || localReview,
        message: "Rəyiniz uğurla əlavə olundu!" 
      });
    }

    // B. Rieltora rəy yazılması
    if (realtor_id) {
      let createdRealtorReview = null;
      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdminClient();
          const targetRealtorId =
            realtor_id === "u-1790232121053" ? "69139734-0c43-4184-ab9e-d1f093e2ef25" : realtor_id;

          const { data, error } = await supabase
            .from("realtor_reviews")
            .insert([
              {
                realtor_id: targetRealtorId,
                reviewer_id: user_id && user_id.length > 20 ? user_id : null,
                reviewer_name: reviewer_name || "Müştəri",
                rating: Number(rating),
                comment: comment.trim(),
                is_reported: false,
                is_hidden: false,
                report_count: 0,
                created_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (!error && data) {
            createdRealtorReview = data;
          }
        } catch (sbErr) {
          console.warn("Supabase realtor review insert failed:", sbErr.message);
        }
      }

      const localReview = addRealtorReview(realtor_id, {
        reviewer_name,
        user_id,
        rating,
        comment,
      });

      return NextResponse.json({ success: true, data: createdRealtorReview || localReview });
    }

    return NextResponse.json({ success: false, message: "Elan və ya rieltor ID tələb olunur." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
