// Tags einer Wiki-Seite: freie Stichwörter, durch Komma getrennt. Ohne führendes #, ohne Doppelte (Groß-/Kleinschreibung egal).

export const MAX_TAGS = 12;
export const MAX_TAG_LENGTH = 30;

export function parseTags(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw ?? "").split(/[,;\n]/)) {
    const tag = part.replace(/^#+/, "").replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH).trim();
    const key = tag.toLowerCase();
    if (tag.length < 2 || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export type TagCount = { tag: string; count: number };

// Alle Tags mit Häufigkeit, die häufigsten zuerst. Schreibweise: die erste gefundene.
export function tagCounts(pages: { tags?: string[] | null }[]): TagCount[] {
  const map = new Map<string, TagCount>();
  for (const p of pages) {
    for (const t of p.tags ?? []) {
      const key = t.toLowerCase();
      const entry = map.get(key) ?? { tag: t, count: 0 };
      entry.count += 1;
      map.set(key, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "de"));
}

export function hasTag(page: { tags?: string[] | null }, tag: string): boolean {
  const key = tag.trim().toLowerCase();
  return (page.tags ?? []).some((t) => t.toLowerCase() === key);
}
