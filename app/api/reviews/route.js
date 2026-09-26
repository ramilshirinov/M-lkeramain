import { NextResponse } from "next/server";
import { getListingReviews, addListingReview, addRealtorReview, getDb } from "@/lib/backend/db";
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

        if (realtorId) {
          // Əgər spesifik rieltor axtarılırsa
          let query = supabase
            .from("realtor_reviews")
            .select("*")
            .eq("is_hidden", false)
            .order("created_at", { ascending: false });

          // Həm verilən id, həm də Ramilin profili ilə yoxlayırıq
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
        } else {
          // Bütün rəylər (məsələn admin və ya ümumi baxış üçün)
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
    const { listing_id, realtor_id, rating, comment, reviewer_name, user_id } = body;

    if (!rating || !comment) {
      return NextResponse.json({ success: false, message: "Reytinq və rəy mətni məcburidir." }, { status: 400 });
    }

    let createdReview = null;

    // 1. Supabase realtor_reviews cədvəlinə yazırıq
    if (isSupabaseConfigured() && realtor_id) {
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
          createdReview = data;

          // Rieltorun orta reytinqini və sayını avtomatik yeniləyirik
          const { data: allRealtorReviews } = await supabase
            .from("realtor_reviews")
            .select("rating")
            .eq("realtor_id", targetRealtorId)
            .eq("is_hidden", false);

          if (allRealtorReviews && allRealtorReviews.length > 0) {
            const count = allRealtorReviews.length;
            const avgRating = Number(
              (allRealtorReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / count).toFixed(1)
            );

            await supabase
              .from("profiles")
              .update({
                rating: avgRating,
                rating_count: count,
                updated_at: new Date().toISOString(),
              })
              .eq("id", targetRealtorId);
          }
        } else if (error) {
          console.error("Supabase review insert error:", error.message);
        }
      } catch (sbErr) {
        console.warn("Supabase review insert failed, fallback to local:", sbErr.message);
      }
    }

    // 2. Local fallback sinxronlaşdırması
    if (listing_id) {
      const newReview = addListingReview({
        listingId: listing_id,
        reviewer_name,
        reviewer_id: user_id,
        rating,
        comment,
      });
      return NextResponse.json({ success: true, data: newReview });
    }

    if (realtor_id) {
      const localReview = addRealtorReview(realtor_id, {
        reviewer_name,
        user_id,
        rating,
        comment,
      });
      return NextResponse.json({ success: true, data: createdReview || localReview });
    }

    return NextResponse.json({ success: false, message: "Elan və ya rieltor ID tələb olunur." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
