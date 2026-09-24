// Realtors API client communicating directly with our Next.js backend

export const REALTOR_SELECT = `*`;

export async function fetchApprovedRealtors(supabase, { sort = "rating" } = {}) {
  try {
    const res = await fetch(`/api/realtors?sort=${sort}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Rieltorlar gətirilə bilmədi");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("fetchApprovedRealtors error:", err);
    return [];
  }
}

export async function fetchRealtorById(supabase, id) {
  try {
    const res = await fetch(`/api/realtors/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error("fetchRealtorById error:", err);
    return null;
  }
}

export async function fetchRealtorListings(supabase, userId) {
  try {
    const res = await fetch(`/api/listings?owner_id=${userId}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("fetchRealtorListings error:", err);
    return [];
  }
}

export async function fetchRealtorReviews(supabase, realtorId) {
  try {
    const res = await fetch(`/api/realtors/${realtorId}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.reviews || [];
  } catch (err) {
    console.error("fetchRealtorReviews error:", err);
    return [];
  }
}

export async function submitReview(supabase, { listingId, realtorId, reviewerId, rating, comment }) {
  const res = await fetch(`/api/realtors/${realtorId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId, user_id: reviewerId, rating, comment }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Rəy göndərilmədi");
  }
  return json.data;
}

export async function fetchPendingRealtors(supabase) {
  try {
    const res = await fetch("/api/admin", { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.pendingRealtors || [];
  } catch (err) {
    console.error("fetchPendingRealtors error:", err);
    return [];
  }
}

export async function updateRealtorApproval(supabase, realtorId, status, adminId, rejectionReason) {
  const action = status === "approved" ? "approve_realtor" : "reject_realtor";
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, id: realtorId, reason: rejectionReason }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Əməliyyat icra olunmadı");
  }
  return json.success;
}
