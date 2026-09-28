import { NextResponse } from "next/server";
import {
  getListingReviews,
  addListingReview,
  addRealtorReview,
  likeReview,
  replyToReview,
  reportReview,
  getDb
} from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("listing_id");
    const realtorId = searchParams.get("realtor_id");

    // 1. Supabase-dən real rəyləri oxuyuruq
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();

        if (listingId) {
          const { data, error } = await supabase
            .from("realtor_reviews")
            .select("*")
            .eq("listing_id", listingId)
            .eq("is_hidden", false)
            .order("created_at", { ascending: false });

          if (!error && Array.isArray(data) && data.length > 0) {
            const formatted = data.map((r) => ({
              id: r.id,
              author_name: r.reviewer_name || "Müştəri",
              rating: r.rating,
              comment: r.comment,
              likes: r.likes || 0,
              replies: r.replies || [],
              is_reported: !!r.is_reported,
              date: r.created_at ? new Date(r.created_at).toLocaleDateString("az-AZ") : "Bu gün",
              created_at: r.created_at,
            }));
            return NextResponse.json({
              success: true,
              reviews: formatted,
              count: formatted.length,
              source: "supabase",
            });
          }
        } else if (realtorId) {
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
              likes: r.likes || 0,
              replies: r.replies || [],
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
        } else {
          const { data, error } = await supabase
            .from("realtor_reviews")
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && Array.isArray(data)) {
            return NextResponse.json({
              success: true,
              reviews: data,
              count: data.length,
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
      return NextResponse.json({ success: true, ...data });
    }

    if (realtorId) {
      const reviews = (db.reviews || []).filter((r) => String(r.realtor_id) === String(realtorId));
      const avg =
        reviews.length > 0
          ? Number((reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / reviews.length).toFixed(1))
          : 5.0;
      return NextResponse.json({ success: true, reviews, count: reviews.length, averageRating: avg });
    }

    return NextResponse.json({ success: true, reviews: db.reviews || [], count: (db.reviews || []).length });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, review_id, listing_id, realtor_id, rating, comment, reviewer_name, user_id, reason, details } = body;

    // Rəyi bəyənmə (Like)
    if (action === "like") {
      const likes = likeReview(review_id);
      if (isSupabaseConfigured() && review_id) {
        try {
          const supabase = getSupabaseAdminClient();
          const { data: rev } = await supabase.from("realtor_reviews").select("likes").eq("id", review_id).single();
          if (rev) {
            await supabase.from("realtor_reviews").update({ likes: (rev.likes || 0) + 1 }).eq("id", review_id);
          }
        } catch (e) {
          console.warn("Supabase like update warning:", e.message);
        }
      }
      return NextResponse.json({ success: true, likes });
    }

    // Rəyə cavab yazma (Reply)
    if (action === "reply") {
      if (!comment) {
        return NextResponse.json({ success: false, message: "Cavab mətni məcburidir." }, { status: 400 });
      }
      const reply = replyToReview(review_id, { reviewer_name, comment, user_id });
      if (isSupabaseConfigured() && review_id) {
        try {
          const supabase = getSupabaseAdminClient();
          const { data: rev } = await supabase.from("realtor_reviews").select("replies").eq("id", review_id).single();
          if (rev) {
            const currentReplies = Array.isArray(rev.replies) ? rev.replies : [];
            const newReplies = [...currentReplies, { author_name: reviewer_name || "İstifadəçi", comment, date: new Date().toISOString() }];
            await supabase.from("realtor_reviews").update({ replies: newReplies }).eq("id", review_id);
          }
        } catch (e) {
          console.warn("Supabase reply update warning:", e.message);
        }
      }
      return NextResponse.json({ success: true, data: reply });
    }

    // Rəyi bildirmə / şikayət etmə (Report)
    if (action === "report") {
      const report = reportReview(review_id, { reason, details, user_id });
      if (isSupabaseConfigured() && review_id) {
        try {
          const supabase = getSupabaseAdminClient();
          const { data: rev } = await supabase.from("realtor_reviews").select("report_count").eq("id", review_id).single();
          if (rev) {
            await supabase.from("realtor_reviews").update({
              is_reported: true,
              report_count: (rev.report_count || 0) + 1
            }).eq("id", review_id);
          }
        } catch (e) {
          console.warn("Supabase report update warning:", e.message);
        }
      }
      return NextResponse.json({ success: true, data: report });
    }

    // Normal rəy göndərmə
    if (!comment) {
      return NextResponse.json({ success: false, message: "Rəy mətni məcburidir." }, { status: 400 });
    }

    let createdReview = null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        const targetRealtorId =
          realtor_id === "u-1790232121053" ? "69139734-0c43-4184-ab9e-d1f093e2ef25" : (realtor_id || null);

        const { data, error } = await supabase
          .from("realtor_reviews")
          .insert([
            {
              listing_id: listing_id || null,
              realtor_id: targetRealtorId || null,
              reviewer_id: user_id && user_id.length > 20 ? user_id : null,
              reviewer_name: reviewer_name || "Müştəri",
              rating: Number(rating || 5),
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
          createdReview = data;
        }
      } catch (sbErr) {
        console.warn("Supabase review insert warning:", sbErr.message);
      }
    }

    // Local DB sinxronlaşdırılması
    if (listing_id) {
      const newReview = addListingReview({
        listingId: listing_id,
        reviewer_name,
        reviewer_id: user_id,
        rating: rating || 5,
        comment,
      });
      return NextResponse.json({ success: true, data: newReview });
    }

    if (realtor_id) {
      const localReview = addRealtorReview(realtor_id, {
        reviewer_name,
        user_id,
        rating: rating || 5,
        comment,
      });
      return NextResponse.json({ success: true, data: createdReview || localReview });
    }

    return NextResponse.json({ success: false, message: "Elan və ya rieltor ID tələb olunur." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
