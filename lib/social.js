const BASES = {
  instagram: "https://instagram.com/",
  tiktok: "https://www.tiktok.com/@",
  facebook: "https://facebook.com/",
  youtube: "https://youtube.com/@",
};

export function normalizeSocial(kind, value) {
  const v = String(value || "").trim();
  if (!v) return null;
  if (/^(javascript|data):/i.test(v)) return null; // təhlükəli sxemlər
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(v)) return `https://${v}`;
  return (BASES[kind] || "https://") + v.replace(/^@/, "");
}
