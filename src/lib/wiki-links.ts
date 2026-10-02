import { stripHtml } from "@/lib/strip-html";

// Verlinkungen zwischen Wiki-Seiten: [[Titel]] oder [[Titel|Anzeigetext]] im Text. Gibt es die Seite nicht, entsteht ein
// roter Link zum Anlegen. Dazu kommen die automatischen Verweise auf Titel und Alternativnamen (siehe autolink.ts).

export const BRACKET_LINK_SOURCE = "\\[\\[([^\\[\\]|]{1,80})(?:\\|([^\\[\\]]{1,80}))?\\]\\]";

export type LinkPage = { id: string; title: string; aliases?: string[] | null; content: string };

// Namen, unter denen eine Seite gefunden wird: Titel, Titel ohne Artikel, Alternativnamen.
export function nameVariants(title: string, aliases?: string[] | null): string[] {
  const t = title.trim();
  return [t, t.replace(/^(der|die|das|ein|eine)\s+/i, ""), ...(aliases ?? [])].map((n) => n.trim()).filter((n) => n.length >= 3);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Klein geschriebener Name -> Seite
export function titleIndex<T extends { id: string; title: string; aliases?: string[] | null }>(pages: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const p of pages) for (const n of nameVariants(p.title, p.aliases)) if (!map.has(n.toLowerCase())) map.set(n.toLowerCase(), p);
  return map;
}

export function bracketTargets(html: string): string[] {
  const text = stripHtml(html);
  return Array.from(text.matchAll(new RegExp(BRACKET_LINK_SOURCE, "g")), (m) => m[1].trim()).filter(Boolean);
}

function mentions(text: string, names: string[]): boolean {
  if (!names.length) return false;
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${names.map(escapeRegex).join("|")})(?![\\p{L}\\p{N}_])`, "iu");
  return re.test(text);
}

// Seiten, die auf `targetId` verweisen: per [[…]] oder weil Titel/Alternativname im Text vorkommt.
export function findBacklinks(pages: LinkPage[], targetId: string): string[] {
  const target = pages.find((p) => p.id === targetId);
  if (!target) return [];
  const names = nameVariants(target.title, target.aliases);
  const lowerNames = new Set(names.map((n) => n.toLowerCase()));
  const out: string[] = [];
  for (const p of pages) {
    if (p.id === targetId) continue;
    const text = stripHtml(p.content);
    const explicit = bracketTargets(p.content).some((t) => lowerNames.has(t.toLowerCase()));
    // Klammer-Links aus dem Text nehmen, damit sie nicht doppelt als Erwähnung zählen.
    const rest = text.replace(new RegExp(BRACKET_LINK_SOURCE, "g"), " ");
    if (explicit || mentions(rest, names)) out.push(p.id);
  }
  return out;
}

export type MissingLink = { title: string; count: number; from: string[] };

// Begriffe in [[…]], zu denen es noch keine Seite gibt, mit Zahl der Seiten, die sie erwähnen.
export function findMissingLinks(pages: LinkPage[], knownNames: Iterable<string> = []): MissingLink[] {
  const index = titleIndex(pages);
  const known = new Set(Array.from(knownNames, (n) => n.trim().toLowerCase()));
  const found = new Map<string, MissingLink>();
  for (const p of pages) {
    const seen = new Set<string>();
    for (const t of bracketTargets(p.content)) {
      const key = t.toLowerCase();
      if (index.has(key) || known.has(key) || seen.has(key)) continue;
      seen.add(key);
      const entry = found.get(key) ?? { title: t, count: 0, from: [] };
      entry.count += 1;
      entry.from.push(p.id);
      found.set(key, entry);
    }
  }
  return Array.from(found.values()).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "de"));
}
