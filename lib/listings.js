// Shared query helpers for listings communicating with Supabase

export const LISTING_SELECT = `*`;

/**
 * Supabase üzərindən bütün aktiv elanları gətirir.
 */
export async function fetchListings(supabase, filters = {}) {
  try {
    if (!supabase || typeof supabase.from !== "function") {
      return { data: [], count: 0 };
    }

    let query = supabase
      .from("listings")
      .select("*, listing_photos(*), categories(*), districts(*)");

    if (filters.status) {
      query = query.eq("status", filters.status);
    } else {
      query = query.eq("status", "active");
    }

    if (filters.transactionType && filters.transactionType !== "all") {
      if (filters.transactionType === "rent") {
        query = query.or("transaction_type.eq.rent,transaction_type.eq.long_term_rent");
      } else {
        query = query.eq("transaction_type", filters.transactionType);
      }
    }

    if (filters.ownerKind && filters.ownerKind !== "all") {
      query = query.eq("owner_kind", filters.ownerKind);
    }

    if (filters.categoryId && filters.categoryId !== "all") {
      query = query.eq("category_id", Number(filters.categoryId));
    }

    if (filters.districtId && filters.districtId !== "all") {
      query = query.eq("district_id", Number(filters.districtId));
    }

    if (filters.city && filters.city !== "all") {
      query = query.eq("city", filters.city);
    }

    if (filters.ownerId) {
      query = query.eq("owner_id", filters.ownerId);
    }

    if (filters.rooms && filters.rooms !== "all") {
      if (filters.rooms === "4+") {
        query = query.gte("room_count", 4);
      } else {
        query = query.eq("room_count", Number(filters.rooms));
      }
    }

    if (filters.priceMin) query = query.gte("price", Number(filters.priceMin));
    if (filters.priceMax) query = query.lte("price", Number(filters.priceMax));
    if (filters.areaMin) query = query.gte("area_m2", Number(filters.areaMin));
    if (filters.areaMax) query = query.lte("area_m2", Number(filters.areaMax));

    if (filters.keyword || filters.search) {
      const s = (filters.keyword || filters.search).trim();
      query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,address.ilike.%${s}%`);
    }

    if (filters.sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (filters.sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else if (filters.sort === "oldest") {
      query = query.order("created_at", { ascending: true });
    } else {
      query = query.order("is_vip", { ascending: false }).order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      console.error("fetchListings Supabase error:", error);
      return { data: [], count: 0 };
    }

    return { data: data || [], count: data ? data.length : 0 };
  } catch (err) {
    console.error("fetchListings exception:", err);
    return { data: [], count: 0 };
  }
}

/**
 * Rieltorun özünə aid olan bütün elanları gətirir.
 */
export async function fetchRealtorListings(supabase, realtorId) {
  try {
    if (!supabase || typeof supabase.from !== "function" || !realtorId) return [];
    const { data, error } = await supabase
      .from("listings")
      .select("*, listing_photos(*), categories(*), districts(*)")
      .eq("owner_id", realtorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchRealtorListings error:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("fetchRealtorListings error:", err);
    return [];
  }
}

export async function fetchCategories(supabase) {
  try {
    if (supabase && typeof supabase.from === "function") {
      const { data, error } = await supabase.from("categories").select("*").order("id");
      if (!error && data && data.length > 0) return data;
    }
    return [];
  } catch (err) {
    console.error("fetchCategories error:", err);
    return [];
  }
}

export async function fetchDistricts(supabase) {
  try {
    if (supabase && typeof supabase.from === "function") {
      const { data, error } = await supabase.from("districts").select("*").order("name");
      if (!error && data && data.length > 0) return data;
    }
    return [];
  } catch (err) {
    console.error("fetchDistricts error:", err);
    return [];
  }
}

export async function fetchListingById(supabase, id) {
  try {
    if (supabase && typeof supabase.from === "function") {
      const { data, error } = await supabase
        .from("listings")
        .select("*, listing_photos(*), categories(*), districts(*)")
        .eq("id", id)
        .maybeSingle();
      if (!error && data) return data;
    }
    const res = await fetch(`/api/listings/${id}`);
    const json = await res.json();
    return json?.data || null;
  } catch (err) {
    console.error("fetchListingById error:", err);
    return null;
  }
}

export async function createListing(supabase, { requestId, listing, media }) {
  const { data, error } = await supabase.rpc("create_listing", {
    p_request_id: requestId,
    p_listing: listing,
    p_media: media,
  });

  if (error) {
    const known = ["phone_required", "media_required", "owner_kind_required", "not_authenticated"];
    const code = known.find((k) => error.message?.includes(k));
    const e = new Error(code || error.message);
    e.code = code;
    throw e;
  }
  return data;
}

export async function replaceListingMedia(supabase, id, media = []) {
  if (!supabase) return;
  // Həm massivi, həm köhnə {photoUrls, videoUrls} formasını qəbul edir
  const list = Array.isArray(media)
    ? media
    : [
        ...(media.photoUrls || media.photos || []).map((u) => ({ url: typeof u === "string" ? u : u?.url, type: "image" })),
        ...(media.videoUrls || media.videos || []).map((u) => ({ url: typeof u === "string" ? u : u?.url, type: "video" })),
      ];
  const clean = list.filter((m) => m?.url);
  const { error } = await supabase.rpc("replace_listing_media", { p_listing: id, p_media: clean });
  if (error) throw error;
}

export async function updateListing(supabase, id, patch, media) {
  const { error } = await supabase
    .from("listings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  if (media) {
    await replaceListingMedia(supabase, id, media);
  }
}

export async function toggleFavorite(supabase, userId, listingId, isFavorited) {
  if (!supabase || !userId) throw new Error("not_authenticated");
  if (isFavorited) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("listing_id", listingId);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from("favorites")
      .insert([{ user_id: userId, listing_id: listingId }]);
    if (error) throw error;
    return true;
  }
}

export async function reportListing(supabase, { listingId, reporterId, reason, details }) {
  if (!supabase || !reporterId) throw new Error("not_authenticated");
  const { error } = await supabase.from("reports").insert([
    {
      listing_id: listingId,
      reporter_id: reporterId,
      reason,
      details,
    },
  ]);
  if (error) throw error;
}

export function localizedField(row, field, locale) {
  return row?.[`${field}_${locale}`] || row?.[`${field}_az`] || row?.[field] || "";
}
