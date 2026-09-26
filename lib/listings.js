// Shared query helpers for listings communicating with Supabase and Next.js Backend

export const LISTING_SELECT = `*`;

/**
 * Supabase və Backend üzərindən bütün aktiv elanları gətirir.
 */
export async function fetchListings(supabase, filters = {}) {
  try {
    // 1. Əgər birbaşa Supabase client verilibsə və işləkdirsə, Supabase query builder istifadə edək
    if (supabase && typeof supabase.from === "function") {
      let query = supabase.from("listings").select("*, listing_photos(*), categories(*), districts(*)");

      if (filters.transactionType && filters.transactionType !== "all") {
        if (filters.transactionType === "rent") {
          query = query.neq("transaction_type", "sale");
        } else {
          query = query.eq("transaction_type", filters.transactionType);
        }
      }

      if (filters.categoryId && filters.categoryId !== "all") {
        query = query.eq("category_id", Number(filters.categoryId));
      }

      if (filters.districtId && filters.districtId !== "all") {
        query = query.eq("district_id", Number(filters.districtId));
      }

      if (filters.ownerId) {
        query = query.eq("owner_id", filters.ownerId);
      }

      if (filters.priceMin) query = query.gte("price", Number(filters.priceMin));
      if (filters.priceMax) query = query.lte("price", Number(filters.priceMax));
      if (filters.areaMin) query = query.gte("area_m2", Number(filters.areaMin));
      if (filters.areaMax) query = query.lte("area_m2", Number(filters.areaMax));

      if (filters.sort === "price_asc") {
        query = query.order("price", { ascending: true });
      } else if (filters.sort === "price_desc") {
        query = query.order("price", { ascending: false });
      } else {
        query = query.order("is_vip", { ascending: false }).order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return { data, count: data.length };
      }
    }

    // 2. API marşrutu vasitəsilə fallback və zəngin filtrasiya
    const params = new URLSearchParams();
    if (filters.keyword || filters.search) params.set("search", filters.keyword || filters.search);
    if (filters.transactionType && filters.transactionType !== "all") params.set("type", filters.transactionType);
    if (filters.categoryId && filters.categoryId !== "all") params.set("category", filters.categoryId);
    if (filters.districtId && filters.districtId !== "all") params.set("district", filters.districtId);
    if (filters.city && filters.city !== "all") params.set("city", filters.city);
    if (filters.rooms && filters.rooms !== "all") params.set("rooms", filters.rooms);
    if (filters.priceMin) params.set("min_price", filters.priceMin);
    if (filters.priceMax) params.set("max_price", filters.priceMax);
    if (filters.areaMin) params.set("min_area", filters.areaMin);
    if (filters.areaMax) params.set("max_area", filters.areaMax);
    if (filters.yardSotMin) params.set("min_sot", filters.yardSotMin);
    if (filters.yardSotMax) params.set("max_sot", filters.yardSotMax);
    if (filters.sort) params.set("sort", filters.sort);
    if (filters.ownerId) params.set("owner_id", filters.ownerId);
    if (filters.vipOnly) params.set("vip_only", "true");
    if (filters.mortgageOnly) params.set("mortgage", "true");

    const res = await fetch(`/api/listings?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Elanlar gətirilə bilmədi");
    const json = await res.json();
    return { data: json.data || [], count: json.count || (json.data || []).length };
  } catch (err) {
    console.error("fetchListings error:", err);
    return { data: [], count: 0 };
  }
}

/**
 * Tək bir elanın məlumatlarını gətirir.
 */
export async function fetchListingById(supabase, id) {
  try {
    if (supabase && typeof supabase.from === "function") {
      const { data, error } = await supabase
        .from("listings")
        .select("*, listing_photos(*), categories(*), districts(*)")
        .eq("id", id)
        .single();
      if (!error && data) return data;
    }

    const res = await fetch(`/api/listings/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error("fetchListingById error:", err);
    return null;
  }
}

/**
 * Supabase sorğusu ilə eyni rayonda və oxşar qiymət aralığında olan elanları gətirir.
 */
export async function fetchSimilarListings(supabase, { listingId, districtId, price, city, categoryId }) {
  try {
    if (supabase && typeof supabase.from === "function") {
      let q = supabase
        .from("listings")
        .select("*, listing_photos(*), categories(*), districts(*)")
        .neq("id", listingId);

      if (districtId) {
        q = q.eq("district_id", districtId);
      } else if (city) {
        q = q.ilike("address", `%${city}%`);
      }

      if (price && Number(price) > 0) {
        const minP = Math.round(Number(price) * 0.75);
        const maxP = Math.round(Number(price) * 1.35);
        q = q.gte("price", minP).lte("price", maxP);
      }

      const { data, error } = await q.limit(4);
      if (!error && data && data.length > 0) {
        return data;
      }
    }

    // Backend endpoint fallback
    const res = await fetch(`/api/listings/${listingId}/similar`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) return json.data;
    }

    return [];
  } catch (err) {
    console.error("fetchSimilarListings error:", err);
    return [];
  }
}

/**
 * Rieltorun özünə aid olan bütün elanları Supabase sorğusu ilə gətirir.
 */
export async function fetchRealtorListings(supabase, realtorId) {
  try {
    if (supabase && typeof supabase.from === "function") {
      const { data, error } = await supabase
        .from("listings")
        .select("*, listing_photos(*), categories(*), districts(*)")
        .or(`owner_id.eq.${realtorId},user_id.eq.${realtorId}`);

      if (!error && data && data.length > 0) {
        return data;
      }
    }

    const res = await fetch(`/api/listings?owner_id=${realtorId}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
    return [];
  } catch (err) {
    console.error("fetchRealtorListings error:", err);
    return [];
  }
}

export async function incrementListingView(supabase, listingId) {
  try {
    if (supabase && typeof supabase.rpc === "function") {
      await supabase.rpc("increment_listing_view", { p_listing_id: listingId });
    }
    await fetch(`/api/listings/${listingId}/view`, { method: "POST" });
  } catch (err) {
    // pass
  }
}

export async function fetchCategories(supabase) {
  try {
    if (supabase && typeof supabase.from === "function") {
      const { data, error } = await supabase.from("categories").select("*").order("id");
      if (!error && data && data.length > 0) return data;
    }

    const res = await fetch("/api/categories", { cache: "no-store" });
    if (!res.ok) throw new Error("Kateqoriyalar gətirilə bilmədi");
    const json = await res.json();
    return json.data || [];
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

    const res = await fetch("/api/districts", { cache: "no-store" });
    if (!res.ok) throw new Error("Rayonlar gətirilə bilmədi");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("fetchDistricts error:", err);
    return [];
  }
}

const MANDATORY_LISTING_FIELDS = [
  "title_az",
  "description_az",
  "category_id",
  "district_id",
  "transaction_type",
  "price",
  "area_m2",
  "address",
  "phone_number",
];

export function validateListingPayload(payload, photoCount) {
  const errors = {};

  MANDATORY_LISTING_FIELDS.forEach((field) => {
    const value = payload[field];
    if (value === undefined || value === null || value === "") {
      errors[field] = "required";
    }
  });

  if (!photoCount || photoCount < 1) {
    errors.photos = "at_least_one_image_required";
  }

  if (payload.price !== undefined && Number(payload.price) <= 0) {
    errors.price = "must_be_positive";
  }

  if (payload.area_m2 !== undefined && Number(payload.area_m2) <= 0) {
    errors.area_m2 = "must_be_positive";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Yeni elanı həm birbaşa Supabase cədvəlinə (listings & listing_photos),
 * həm də daxili API-yə yazaraq real-vaxtda saytda görünməsini təmin edir.
 */
export async function createListing(supabase, { payload, photoUrls = [], videoUrls = [] }) {
  const { valid, errors } = validateListingPayload(payload, photoUrls?.length);
  if (!valid) {
    const err = new Error("Validation failed");
    err.fieldErrors = errors;
    throw err;
  }

  // 1. Birbaşa Supabase cədvəlinə cəhd
  let createdSupabaseListing = null;
  if (supabase && typeof supabase.from === "function") {
    try {
      const { data, error } = await supabase
        .from("listings")
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        createdSupabaseListing = data;

        // Şəkilləri listing_photos cədvəlinə yazırıq
        const photosToInsert = [
          ...photoUrls.map((url) => ({
            listing_id: data.id,
            url,
            media_type: "image",
          })),
          ...videoUrls.map((url) => ({
            listing_id: data.id,
            url,
            media_type: "video",
          })),
        ];

        if (photosToInsert.length > 0) {
          await supabase.from("listing_photos").insert(photosToInsert);
        }
      }
    } catch (sbErr) {
      console.warn("Supabase direct insert fallback to API:", sbErr.message);
    }
  }

  // 2. Saytın real-vaxt bazası ilə tam sinxronizasiya (həmən görünməsi üçün)
  const res = await fetch("/api/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: {
        ...(createdSupabaseListing || {}),
        ...payload,
      },
      photoUrls,
      videoUrls,
    }),
  });

  let json = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      json = await res.json();
    } catch (e) {
      json = null;
    }
  }

  if (!res.ok || !json?.success) {
    if (createdSupabaseListing) return createdSupabaseListing;
    if (res.status === 413) {
      throw new Error("Yüklənən faylların həcmi həddən artıq böyükdür (413 Payload Too Large). Zəhmət olmasa şəkillərin ölçüsünü azaldın.");
    }
    const msg = json?.message || (res.statusText ? `Server xətası (${res.status})` : "Elan yaradılarkən xəta baş verdi");
    throw new Error(msg);
  }

  return json.data;
}

export async function updateListing(supabase, id, payload) {
  if (supabase && typeof supabase.from === "function") {
    try {
      await supabase.from("listings").update(payload).eq("id", id);
    } catch (e) {}
  }

  const res = await fetch(`/api/listings/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Elan yenilənmədi");
  }

  return json.data;
}

export async function replaceListingMedia(supabase, listingId, { photoUrls = [], videoUrls = [] }) {
  const res = await fetch(`/api/listings/${listingId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoUrls, videoUrls }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Şəkillər yenilənmədi");
  }

  return json.data;
}

export async function toggleFavorite(supabase, userId, listingId, isFavorited) {
  if (supabase && typeof supabase.from === "function") {
    try {
      if (isFavorited) {
        await supabase.from("favorites").delete().eq("user_id", userId).eq("listing_id", listingId);
      } else {
        await supabase.from("favorites").insert([{ user_id: userId, listing_id: listingId }]);
      }
    } catch (e) {}
  }

  const res = await fetch(`/api/listings/${listingId}/favorite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const json = await res.json();
  return json.favorited;
}

export async function reportListing(supabase, { listingId, reporterId, reason, details }) {
  if (supabase && typeof supabase.from === "function") {
    try {
      await supabase.from("reports").insert([{
        listing_id: listingId,
        reporter_id: reporterId,
        reason,
        details,
      }]);
    } catch (e) {}
  }

  const res = await fetch(`/api/listings/${listingId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporterId, reason, details }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Şikayət göndərilmədi");
  }
}

export function localizedField(row, field, locale) {
  return row?.[`${field}_${locale}`] || row?.[`${field}_az`] || "";
}
