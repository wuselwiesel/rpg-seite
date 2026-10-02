import { folderSubtreeIds, type FolderRow } from "@/lib/wiki-tree";
import { hasTag } from "@/lib/wiki-tags";

// Suche im Wiki mit Filtern. Trefferreihenfolge: Titel, Alternativname, Kurztext, Text.

export type SearchEntry = {
  id: string;
  title: string;
  lead?: string | null;
  aliases?: string[] | null;
  text: string; // Klartext des Artikels
  page_type?: string | null;
  tags?: string[] | null;
  folder_id: string | null;
  updated_at?: string;
};

export type SearchFilters = { q?: string; type?: string; tag?: string; folderId?: string };
export type SearchHit<T extends SearchEntry = SearchEntry> = { entry: T; score: number; snippet: string };

function snippetAround(text: string, needle: string, radius = 70): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const at = flat.toLowerCase().indexOf(needle);
  if (at < 0) return flat.slice(0, radius * 2) + (flat.length > radius * 2 ? "…" : "");
  const from = Math.max(0, at - radius);
  const to = Math.min(flat.length, at + needle.length + radius);
  return `${from > 0 ? "…" : ""}${flat.slice(from, to)}${to < flat.length ? "…" : ""}`;
}

export function searchWiki<T extends SearchEntry>(entries: T[], folders: FolderRow[], filters: SearchFilters): SearchHit<T>[] {
  const q = (filters.q ?? "").trim().toLowerCase();
  const folderIds = filters.folderId ? folderSubtreeIds(folders, filters.folderId) : null;
  const hits: SearchHit<T>[] = [];
  for (const e of entries) {
    if (filters.type && e.page_type !== filters.type) continue;
    if (filters.tag && !hasTag(e, filters.tag)) continue;
    if (folderIds && !(e.folder_id && folderIds.has(e.folder_id))) continue;
    if (!q) {
      hits.push({ entry: e, score: 0, snippet: e.lead?.trim() || snippetAround(e.text, "", 70) });
      continue;
    }
    const title = e.title.toLowerCase();
    let score = 0;
    let snippet = "";
    if (title === q) score = 100;
    else if (title.startsWith(q)) score = 80;
    else if (title.includes(q)) score = 60;
    else if ((e.aliases ?? []).some((a) => a.toLowerCase().includes(q))) score = 50;
    else if ((e.lead ?? "").toLowerCase().includes(q)) score = 40;
    else if (e.text.toLowerCase().includes(q)) {
      score = 20;
      snippet = snippetAround(e.text, q);
    } else continue;
    hits.push({ entry: e, score, snippet: snippet || e.lead?.trim() || snippetAround(e.text, q) });
  }
  return hits.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, "de"));
}
