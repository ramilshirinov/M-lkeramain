export async function searchUsers(supabase, q, signal) {
  const query = supabase.rpc("search_users", { p_query: q, p_limit: 15 });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return data || [];
}

export async function openConversation(supabase, otherId, listingId = null) {
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_other: otherId,
    p_listing: listingId,
  });
  if (error) throw error;
  return data; // conversation uuid
}

export async function listConversations(supabase, myId) {
  const { data: convs, error } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throw error;

  const otherIds = [
    ...new Set(
      (convs || [])
        .flatMap((c) => c.participant_ids || [])
        .filter((id) => id !== myId)
    ),
  ];

  const { data: people } = otherIds.length
    ? await supabase
        .from("public_profiles")
        .select("id, full_name, agency_name, avatar_url, role")
        .in("id", otherIds)
    : { data: [] };

  const byId = Object.fromEntries((people || []).map((p) => [p.id, p]));

  const { data: unread } = await supabase
    .from("messages")
    .select("conversation_id")
    .eq("receiver_id", myId)
    .eq("read", false);

  const counts = {};
  (unread || []).forEach((m) => {
    counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1;
  });

  return (convs || []).map((c) => ({
    ...c,
    other: byId[c.participant_ids?.find((id) => id !== myId)] || null,
    unread: counts[c.id] || 0,
  }));
}

export async function sendMessage(supabase, { conversationId, myId, otherId, listingId, content }) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: myId,
      receiver_id: otherId,
      listing_id: listingId ?? null,
      content,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export const markRead = (supabase, conversationId, myId) =>
  supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .eq("receiver_id", myId)
    .eq("read", false);
