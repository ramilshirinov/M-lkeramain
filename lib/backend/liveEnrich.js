// Server-only: real Supabase live_streams sətirlərini frontend-in gözlədiyi
// left_realtor / right_realtor şəklinə zənginləşdirir (profil + elan + şəkil).

function formatPrice(listing) {
  if (!listing) return null;
  const amount = Number(listing.price || 0).toLocaleString("az-AZ");
  return `${amount} ${listing.currency || "AZN"}`;
}

export async function enrichLiveStreamRow(supabase, row) {
  if (!row) return row;

  const ids = [row.host_id, row.rival_id].filter(Boolean);
  const listingIds = [row.left_listing_id, row.right_listing_id].filter(Boolean);

  const [{ data: profiles } = { data: [] }, { data: listings } = { data: [] }] = await Promise.all([
    ids.length
      ? supabase.from("profiles").select("id, full_name, avatar_url, agency_name").in("id", ids)
      : Promise.resolve({ data: [] }),
    listingIds.length
      ? supabase.from("listings").select("id, title, price, currency, listing_photos(url)").in("id", listingIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  const listingById = Object.fromEntries((listings || []).map((l) => [l.id, l]));

  const hostProfile = row.host_id ? profileById[row.host_id] : null;
  const rivalProfile = row.rival_id ? profileById[row.rival_id] : null;
  const leftListing = row.left_listing_id ? listingById[row.left_listing_id] : null;
  const rightListing = row.right_listing_id ? listingById[row.right_listing_id] : null;

  return {
    ...row,
    comments: row.live_comments || row.comments || [],
    left_realtor: {
      id: row.host_id,
      name: hostProfile?.full_name || "Rieltor",
      avatar: hostProfile?.avatar_url || null,
      agency: hostProfile?.agency_name || "MÜLKERA",
      score: row.left_score || 0,
      property: leftListing
        ? {
            title: leftListing.title,
            price: formatPrice(leftListing),
            image: leftListing.listing_photos?.[0]?.url || null,
            listing_id: leftListing.id,
          }
        : null,
    },
    right_realtor: row.is_pk
      ? {
          id: row.rival_id,
          name: rivalProfile?.full_name || "Rəqib Rieltor",
          avatar: rivalProfile?.avatar_url || null,
          agency: rivalProfile?.agency_name || "MÜLKERA",
          score: row.right_score || 0,
          property: rightListing
            ? {
                title: rightListing.title,
                price: formatPrice(rightListing),
                image: rightListing.listing_photos?.[0]?.url || null,
                listing_id: rightListing.id,
              }
            : null,
        }
      : null,
  };
}

export async function enrichLiveStreamRows(supabase, rows) {
  return Promise.all((rows || []).map((row) => enrichLiveStreamRow(supabase, row)));
}
