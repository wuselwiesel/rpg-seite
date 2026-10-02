// Verlinkt Wiki-Begriffe und #Hashtags im (bereits bereinigten) HTML eines Beitrags.
// Arbeitet nur auf Textknoten und lässt Links und @-Erwähnungen unangetastet.

import { BRACKET_LINK_SOURCE, escapeRegex, nameVariants } from "@/lib/wiki-links";

// `category` ist die Beschriftung für die Vorschau (heute der Ordnername); ältere Schlüssel werden übersetzt.
export type WikiTerm = { id: string; title: string; category: string; excerpt: string; aliases?: string[]; coverImageUrl?: string | null };

const CATEGORY_LABELS: Record<string, string> = { ort: "Ort", npc: "NPC", fraktion: "Fraktion", sonstiges: "Sonstiges" };

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wikiAnchor(entry: WikiTerm, label: string): string {
  return (
    `<a class="wiki-link" href="/wiki/${entry.id}" data-wiki-title="${escapeAttr(entry.title)}"` +
    ` data-wiki-cat="${escapeAttr(CATEGORY_LABELS[entry.category] ?? (entry.category || "Wiki"))}"` +
    ` data-wiki-excerpt="${escapeAttr(entry.excerpt)}"` +
    (entry.coverImageUrl ? ` data-wiki-cover="${escapeAttr(entry.coverImageUrl)}"` : "") +
    `>${label}</a>`
  );
}

// Ersetzt [[Titel]] und [[Titel|Anzeigetext]] in Textknoten durch Links; unbekannte Titel werden rote Links zum Anlegen.
export function linkWikiBrackets(html: string, wiki: WikiTerm[] = []): string {
  if (!html.includes("[[")) return html;
  const byName = new Map<string, WikiTerm>();
  for (const entry of wiki) for (const n of nameVariants(entry.title, entry.aliases)) if (!byName.has(n.toLowerCase())) byName.set(n.toLowerCase(), entry);
  const re = new RegExp(BRACKET_LINK_SOURCE, "g");
  let anchorDepth = 0;
  return html
    .split(/(<[^>]*>)/)
    .map((segment) => {
      if (segment.startsWith("<")) {
        if (/^<a[\s>]/i.test(segment)) anchorDepth++;
        else if (/^<\/a>/i.test(segment)) anchorDepth = Math.max(0, anchorDepth - 1);
        return segment;
      }
      if (anchorDepth > 0 || !segment.includes("[[")) return segment;
      return segment.replace(re, (_m, target: string, label?: string) => {
        const name = target.trim();
        const shown = (label ?? name).trim();
        const entry = byName.get(name.toLowerCase());
        if (entry) return wikiAnchor(entry, shown);
        return `<a class="wiki-missing" href="/wiki/new?title=${encodeURIComponent(name)}" title="Noch keine Seite. Anlegen.">${shown}</a>`;
      });
    })
    .join("");
}

export function autolinkHtml(
  html: string,
  options: { wiki?: WikiTerm[]; tagHref?: string; excludeWikiId?: string },
): string {
  // [[…]] nur dort verlinken, wo das Wiki mitgegeben wird (Wiki-Seiten, Beiträge mit Verknüpfung), nicht in jedem Text.
  if (options.wiki) html = linkWikiBrackets(html, options.wiki);
  // Jeder Eintrag ist unter seinem Titel, dem Titel ohne Artikel ("Die Kapelle von X" -> "Kapelle von X")
  // und seinen Alternativnamen auffindbar.
  const names: { name: string; entry: WikiTerm }[] = [];
  for (const entry of options.wiki ?? []) {
    if (entry.id === options.excludeWikiId) continue;
    for (const name of nameVariants(entry.title, entry.aliases)) names.push({ name, entry });
  }
  names.sort((a, b) => b.name.length - a.name.length);
  const byLower = new Map<string, WikiTerm>();
  for (const n of names) if (!byLower.has(n.name.toLowerCase())) byLower.set(n.name.toLowerCase(), n.entry);
  const terms = names;
  if (!options.tagHref && terms.length === 0) return html;
  // Beide Alternativen haben immer genau eine Gruppe (Hashtag, Begriff). Fehlt eine, steht ein nie passender
  // Platzhalter "(?!)()" an ihrer Stelle – sonst verschieben sich die Callback-Argumente (Gruppe 1 wäre dann der Begriff).
  const NEVER = "(?!)()";
  const tagPart = options.tagHref ? "(?<![\\p{L}\\p{N}_&])#([\\p{L}\\p{N}_]+)" : NEVER;
  const termPart = terms.length
    ? `(?<![\\p{L}\\p{N}_])(${Array.from(byLower.keys()).sort((a, b) => b.length - a.length).map(escapeRegex).join("|")})(?![\\p{L}\\p{N}_])`
    : NEVER;
  const regex = new RegExp(`${tagPart}|${termPart}`, "giu");
  const linked = new Set<string>();

  let anchorDepth = 0;
  let inMention = false;
  return html
    .split(/(<[^>]*>)/)
    .map((segment) => {
      if (segment.startsWith("<")) {
        if (/^<a[\s>]/i.test(segment)) anchorDepth++;
        else if (/^<\/a>/i.test(segment)) anchorDepth = Math.max(0, anchorDepth - 1);
        else if (/^<span\b[^>]*data-type="mention"/i.test(segment)) inMention = true;
        else if (/^<\/span>/i.test(segment)) inMention = false;
        return segment;
      }
      if (anchorDepth > 0 || inMention || !segment.trim()) return segment;
      return segment.replace(regex, (match: string, tag?: string, term?: string) => {
        if (tag !== undefined && options.tagHref) {
          return `<a class="hashtag" href="${escapeAttr(options.tagHref)}?tag=${encodeURIComponent(tag.toLowerCase())}">#${tag}</a>`;
        }
        const entry = byLower.get((term ?? match).trim().toLowerCase());
        if (!entry || linked.has(entry.id)) return match;
        linked.add(entry.id);
        return wikiAnchor(entry, match);
      });
    })
    .join("");
}
