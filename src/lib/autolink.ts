// Verlinkt Wiki-Begriffe und #Hashtags im (bereits bereinigten) HTML eines Beitrags.
// Arbeitet nur auf Textknoten und lässt Links und @-Erwähnungen unangetastet.

export type WikiTerm = { id: string; title: string; category: string; excerpt: string; aliases?: string[]; coverImageUrl?: string | null };

const CATEGORY_LABELS: Record<string, string> = { ort: "Ort", npc: "NPC", fraktion: "Fraktion", sonstiges: "Sonstiges" };

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function autolinkHtml(
  html: string,
  options: { wiki?: WikiTerm[]; tagHref?: string; excludeWikiId?: string },
): string {
  // Jeder Eintrag ist unter seinem Titel, dem Titel ohne Artikel ("Die Kapelle von X" -> "Kapelle von X")
  // und seinen Alternativnamen auffindbar.
  const names: { name: string; entry: WikiTerm }[] = [];
  for (const entry of options.wiki ?? []) {
    if (entry.id === options.excludeWikiId) continue;
    const title = entry.title.trim();
    for (const name of [title, title.replace(/^(der|die|das|ein|eine)\s+/i, ""), ...(entry.aliases ?? [])]) {
      if (name.trim().length >= 3) names.push({ name: name.trim(), entry });
    }
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
        return (
          `<a class="wiki-link" href="/wiki/${entry.id}" data-wiki-title="${escapeAttr(entry.title)}"` +
          ` data-wiki-cat="${escapeAttr(CATEGORY_LABELS[entry.category] ?? "Wiki")}"` +
          ` data-wiki-excerpt="${escapeAttr(entry.excerpt)}"` +
          (entry.coverImageUrl ? ` data-wiki-cover="${escapeAttr(entry.coverImageUrl)}"` : "") +
          `>${match}</a>`
        );
      });
    })
    .join("");
}
