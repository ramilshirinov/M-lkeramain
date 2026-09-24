// Supabase və Backend üzərindən Canlı Yayım (live_streams), PK Arena (pk_matches)
// və Reytinq (realtor_monthly_stats) servisi.
// Bütün əməliyyatlar əvvəlcə /api/live/* marşrutları üzərindən gedir (bu marşrutlar
// Supabase konfiqurasiya edilibsə real cədvəllərə yazır, əks halda demo backend-ə keçir).

/**
 * Canlı yayımların siyahısını gətirir.
 * @param {object} supabase - Supabase Client (realtime abunəlik üçün istifadə edilə bilər)
 * @param {string} status - 'active' | 'scheduled' | 'ended' | 'all'
 */
export async function fetchLiveStreams(supabase, status = "active") {
  try {
    if (supabase && typeof supabase.from === "function") {
      let query = supabase.from("live_streams").select("*, live_comments(*)");
      if (status !== "all") {
        query = query.eq("status", status);
      }
      query = query.order("viewers_count", { ascending: false });
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((s) => ({ ...s, comments: s.live_comments || [] }));
      }
    }

    const res = await fetch(`/api/live?status=${status}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("fetchLiveStreams error:", err);
    return [];
  }
}

/**
 * Yeni canlı yayım və ya PK Arenası otağı açır (real LiveKit otağı + Supabase sətri daxil).
 */
export async function startLiveStream(supabase, { title, description, isPk = false, hostId, rivalId = null, listingId = null }) {
  try {
    const res = await fetch("/api/live/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        isPk,
        hostId,
        rivalId,
        leftPropertyId: listingId,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || "Canlı yayım başladıla bilmədi");
    }
    return json;
  } catch (err) {
    console.error("startLiveStream error:", err);
    throw err;
  }
}

/**
 * İzləyicinin (və ya rəqibin) canlı otağa qoşulması.
 */
export async function joinLiveStream(supabase, { streamId, participantId, participantName, role = "viewer" }) {
  try {
    const res = await fetch("/api/live/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamId, participantId, participantName, role }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Otağa qoşulmaq mümkün olmadı");
    return json;
  } catch (err) {
    console.error("joinLiveStream error:", err);
    throw err;
  }
}

/**
 * Verilmiş otaq üçün LiveKit media tokeni alır (real WebRTC video/audio üçün).
 */
export async function getLiveKitToken({ roomName, identity, name, role = "viewer" }) {
  const res = await fetch("/api/live/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomName, identity, name, role }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Media tokeni alınmadı");
  return json;
}

/**
 * Canlı yayıma PK hədiyyəsi və ya xal göndərir. Server tərəfdə DB trigger
 * live_streams.left_score/right_score + pk_matches xalını avtomatik artırır.
 */
export async function sendLiveGift(supabase, { streamId, side = "left", gift, senderId = null, senderName = "Qonaq" }) {
  try {
    const res = await fetch("/api/live/gift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streamId,
        targetSide: side,
        senderId,
        senderName,
        giftId: gift?.id,
        giftName: gift?.name,
        giftIcon: gift?.icon,
        price: gift?.price,
        points: gift?.points,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Hədiyyə göndərilmədi");
    return json.data;
  } catch (err) {
    console.error("sendLiveGift error:", err);
    throw err;
  }
}

/**
 * Şərh göndərir.
 */
export async function sendLiveComment(supabase, { streamId, senderId = null, senderName = "Qonaq", text }) {
  const res = await fetch("/api/live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "comment", streamId, senderId, senderName, text }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Şərh göndərilmədi");
  return json.data;
}

/**
 * Aktiv PK matçını gətirir (xallar, iştirakçılar).
 */
export async function fetchActivePkMatch(streamId) {
  try {
    const res = await fetch(`/api/live/pk?streamId=${streamId}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error("fetchActivePkMatch error:", err);
    return null;
  }
}

/**
 * PK matçını bitirir, qalibi müəyyən edir və aylıq rieltor reytinqinə xal yazır.
 */
export async function finishPkMatch({ streamId, matchId }) {
  const res = await fetch("/api/live/pk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ streamId, matchId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "PK matçı bitirilmədi");
  return json;
}

/**
 * Rieltorların aylıq reytinq və statistika cədvəlini gətirir.
 */
export async function fetchRealtorStats(supabase, { limit = 20 } = {}) {
  try {
    if (supabase && typeof supabase.from === "function") {
      const { data, error } = await supabase
        .from("realtor_monthly_stats")
        .select("*, profiles(*)")
        .order("score", { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data;
      }
    }

    const res = await fetch(`/api/realtors/rankings?limit=${limit}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("fetchRealtorStats error:", err);
    return [];
  }
}

/**
 * Bir canlı yayımın Realtime dəyişikliklərinə (xal, izləyici sayı, status) abunə olur.
 * @returns unsubscribe funksiyası
 */
export function subscribeToLiveStream(supabase, streamId, onChange) {
  if (!supabase || typeof supabase.channel !== "function" || !streamId) {
    return () => {};
  }
  const channel = supabase
    .channel(`live_streams:${streamId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${streamId}` }, (payload) => {
      onChange?.({ type: "stream", row: payload.new });
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_gifts", filter: `stream_id=eq.${streamId}` }, (payload) => {
      onChange?.({ type: "gift", row: payload.new });
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_comments", filter: `stream_id=eq.${streamId}` }, (payload) => {
      onChange?.({ type: "comment", row: payload.new });
    })
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      /* no-op */
    }
  };
}
