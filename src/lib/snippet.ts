// Textausschnitt um die erste Fundstelle (für Suchtreffer)
export function snippetAround(text: string, needle: string, before = 40, after = 70): string {
  const i = text.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return text.slice(0, before + after);
  const start = Math.max(0, i - before);
  const end = i + needle.length + after;
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}
