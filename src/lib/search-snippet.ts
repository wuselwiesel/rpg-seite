// Kurzer Textausschnitt rund um den ersten Treffer (ohne Groß-/Kleinschreibung); ohne Treffer der Textanfang.
export function snippetAround(text: string, query: string, radius = 70): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const q = query.trim().toLowerCase();
  const at = q ? clean.toLowerCase().indexOf(q) : -1;
  if (at < 0) return clean.length > radius * 2 ? `${clean.slice(0, radius * 2).trimEnd()}…` : clean;
  const start = Math.max(0, at - radius);
  const end = Math.min(clean.length, at + q.length + radius);
  return `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${end < clean.length ? "…" : ""}`;
}
