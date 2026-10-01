// Azərbaycan nömrələri: 9 rəqəm (operator kodu + 7). Yoxlayıb standart formata salır.
export function normalizeAzPhone(raw = "") {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("994")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length !== 9) return null;
  return {
    e164: `+994${d}`,
    digits: `994${d}`,
    display: `+994 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`,
  };
}
