export function getMediaUrl(url, supabase) {
  if (!url) return "/images/placeholder-property.svg";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const { data } = supabase.storage.from("listings").getPublicUrl(url);
  return data?.publicUrl || url;
}