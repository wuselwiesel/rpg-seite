// Eine geteilte Wiki-Seite im Chat: zwei Zeilen, „📖 Titel“ und der Link auf die Seite.
const LINK_LINE = /^(https?:\/\/[^\s]+\/wiki\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))\/?$/i;

export function wikiShareText(title: string, url: string): string {
  return `📖 ${title.replace(/\s+/g, " ").trim().slice(0, 120)}\n${url}`;
}

export function parseWikiShare(content: string): { title: string; pageId: string } | null {
  const lines = content.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const m = lines[lines.length - 1].match(LINK_LINE);
  if (!m) return null;
  const title = lines.slice(0, -1).join(" ").replace(/^📖\s*/, "").trim();
  return { title: title || "Wiki-Seite", pageId: m[2].toLowerCase() };
}
