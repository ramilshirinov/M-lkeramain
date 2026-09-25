import { NextResponse } from "next/server";
import { queryListings, insertListing } from "@/lib/backend/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseServer";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "all";
    const category = searchParams.get("category") || "all";
    const city = searchParams.get("city") || "all";
    const district = searchParams.get("district") || "all";
    const rooms = searchParams.get("rooms") || "all";
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const minArea = searchParams.get("min_area");
    const maxArea = searchParams.get("max_area");
    const sort = searchParams.get("sort") || "newest";
    const ownerId = searchParams.get("owner_id");

    // 1. Supabase əsas məlumat mənbəyidir
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        let query = supabase
          .from("listings")
          .select("*, listing_photos(*), categories(*), districts(*)")
          .order("is_vip", { ascending: false });

        if (ownerId) {
          query = query.or(`owner_id.eq.${ownerId},owner_id.eq.69139734-0c43-4184-ab9e-d1f093e2ef25`);
        } else {
          query = query.eq("status", "active");
        }

        if (type && type !== "all") {
          if (type === "rent") {
            query = query.eq("transaction_type", "rent");
          } else if (type === "daily" || type === "daily_rent") {
            query = query.in("transaction_type", ["daily_rent", "daily", "short_term_rent"]);
          } else if (type === "sale") {
            query = query.eq("transaction_type", "sale");
          }
        }

        if (category && category !== "all" && !isNaN(Number(category))) {
          query = query.eq("category_id", Number(category));
        }

        if (district && district !== "all" && !isNaN(Number(district))) {
          query = query.eq("district_id", Number(district));
        }

        if (minPrice) query = query.gte("price", Number(minPrice));
        if (maxPrice) query = query.lte("price", Number(maxPrice));
        if (minArea) query = query.gte("area_m2", Number(minArea));
        if (maxArea) query = query.lte("area_m2", Number(maxArea));

        if (rooms && rooms !== "all") {
          if (rooms === "4+") {
            query = query.gte("room_count", 4);
          } else if (!isNaN(Number(rooms))) {
            query = query.eq("room_count", Number(rooms));
          }
        }

        if (sort === "price_asc") {
          query = query.order("price", { ascending: true });
        } else if (sort === "price_desc") {
          query = query.order("price", { ascending: false });
        } else {
          query = query.order("created_at", { ascending: false });
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          // Axtarış sözü varsa tətbiq edirik
          let results = data;
          if (search) {
            const s = search.toLowerCase();
            results = data.filter(
              (item) =>
                item.title?.toLowerCase().includes(s) ||
                item.description?.toLowerCase().includes(s) ||
                item.address?.toLowerCase().includes(s)
            );
          }

          return NextResponse.json({ success: true, data: results, count: results.length, source: "supabase" });
        }
      } catch (sbErr) {
        console.warn("Supabase listings query fallback:", sbErr.message);
      }
    }

    // 2. Fallback: local backend DB
    const listings = queryListings({
      search,
      type,
      category,
      city,
      district,
      rooms,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      sort,
      ownerId,
    });

    return NextResponse.json({ success: true, data: listings, count: listings.length, source: "local" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { payload, photoUrls = [], videoUrls = [] } = body;

    if (!payload || !payload.title_az || !payload.price) {
      return NextResponse.json({ success: false, message: "Məcburi sahələri doldurun." }, { status: 400 });
    }

    const userIdCookie = req.cookies.get("mulkera_user_id");
    let ownerId = payload.owner_id || userIdCookie?.value || "69139734-0c43-4184-ab9e-d1f093e2ef25";

    let createdRecord = null;

    // 1. Supabase-ə birbaşa yazırıq
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient();
        const insertData = {
          owner_id: ownerId.length > 20 ? ownerId : "69139734-0c43-4184-ab9e-d1f093e2ef25",
          title: payload.title_az || payload.title,
          description: payload.description_az || payload.description,
          transaction_type: payload.transaction_type || "sale",
          category_id: payload.category_id ? Number(payload.category_id) : 1,
          district_id: payload.district_id ? Number(payload.district_id) : null,
          city: payload.city || "Bakı",
          address: payload.address,
          latitude: payload.latitude ? Number(payload.latitude) : 40.4093,
          longitude: payload.longitude ? Number(payload.longitude) : 49.8671,
          price: Number(payload.price),
          currency: payload.currency || "AZN",
          area_m2: Number(payload.area_m2),
          room_count: payload.room_count ? Number(payload.room_count) : 1,
          floor: payload.floor_number ? Number(payload.floor_number) : null,
          floor_total: payload.total_floors ? Number(payload.total_floors) : null,
          is_vip: !!payload.is_vip,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: sbListing, error: sbError } = await supabase
          .from("listings")
          .insert([insertData])
          .select()
          .single();

        if (!sbError && sbListing) {
          createdRecord = sbListing;

          // Şəkilləri əlavə edirik
          const allMedia = [
            ...photoUrls.map((url, i) => ({
              listing_id: sbListing.id,
              url,
              media_type: "image",
              sort_order: i,
            })),
            ...videoUrls.map((url, i) => ({
              listing_id: sbListing.id,
              url,
              media_type: "video",
              sort_order: photoUrls.length + i,
            })),
          ];

          if (allMedia.length > 0) {
            await supabase.from("listing_photos").insert(allMedia);
          }
        } else if (sbError) {
          console.error("Supabase insert listing error:", sbError.message);
        }
      } catch (sbErr) {
        console.warn("Supabase listing insert failed, fallback to local:", sbErr.message);
      }
    }

    // 2. Local backend DB sinxronlaşdırması
    const localListing = insertListing(
      { ...(createdRecord || {}), ...payload, owner_id: ownerId },
      photoUrls,
      videoUrls
    );

    return NextResponse.json({
      success: true,
      data: createdRecord || localListing,
      message: "Elan uğurla yerləşdirildi!",
    });
  } catch (err) {
    console.error("Listing POST error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
