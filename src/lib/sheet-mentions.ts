// @-Erwähnungen von Charakteren in den Feldern des ChaBo (z. B. „Familie“): Im Text steht schlicht „@Name“.
// Beim Anzeigen wird „@Name“ mit der Liste der Charaktere der Welt abgeglichen (längster Name zuerst) und zum Link.

export type MentionTarget = { id: string; name: string; avatar_url?: string | null };
export type MentionPart = { kind: "text"; text: string } | { kind: "mention"; target: MentionTarget; text: string };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function splitMentions(text: string, targets: MentionTarget[]): MentionPart[] {
  const named = targets.filter((t) => t.name.trim()).sort((a, b) => b.name.length - a.name.length);
  if (!text.includes("@") || named.length === 0) return [{ kind: "text", text }];
  const byName = new Map<string, MentionTarget>();
  for (const t of named) if (!byName.has(t.name.toLowerCase())) byName.set(t.name.toLowerCase(), t);
  const re = new RegExp(`@(${named.map((t) => escapeRe(t.name)).join("|")})(?![\\p{L}\\p{N}])`, "giu");

  const parts: MentionPart[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const target = byName.get(m[1].toLowerCase());
    if (!target || m.index == null) continue;
    if (m.index > last) parts.push({ kind: "text", text: text.slice(last, m.index) });
    parts.push({ kind: "mention", target, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts.length ? parts : [{ kind: "text", text }];
}

// Steht der Cursor hinter „@abc“ (am Anfang oder nach Leerzeichen/Komma), liefert das die Suche und die Position des „@“.
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const m = /(^|[\s(,;])@([^\s@]*)$/u.exec(before);
  if (!m) return null;
  return { start: before.length - m[2].length - 1, query: m[2] };
}

// Passende Charaktere: zuerst Namen (oder einzelne Wörter), die mit der Suche beginnen, dann solche, die sie enthalten.
export function matchTargets(targets: MentionTarget[], query: string, limit = 6): MentionTarget[] {
  const q = query.trim().toLowerCase();
  const scored = targets
    .map((t) => {
      const name = t.name.toLowerCase();
      const words = name.split(/\s+/);
      const rank = q === "" ? 1 : name.startsWith(q) ? 0 : words.some((w) => w.startsWith(q)) ? 1 : name.includes(q) ? 2 : 3;
      return { t, rank };
    })
    .filter((x) => x.rank < 3)
    .sort((a, b) => a.rank - b.rank || a.t.name.localeCompare(b.t.name, "de"));
  return scored.slice(0, limit).map((x) => x.t);
}

// „@abc“ (von start bis zum Cursor) durch „@Name “ ersetzen.
export function insertMention(text: string, caret: number, start: number, name: string): { text: string; caret: number } {
  const before = text.slice(0, start);
  const after = text.slice(caret).replace(/^\s/, "");
  const inserted = `@${name} `;
  return { text: before + inserted + after, caret: (before + inserted).length };
}

// In der Ansicht steht bei erwähnten Charakteren nur der Name ohne „@“ (im Editor bleibt das @ als Auslöser).
export const withoutAt = (text: string) => (text.startsWith("@") ? text.slice(1) : text);

// Dasselbe für Erwähnungen in formatierten Notizen: <span data-type="mention">@Name</span> → Name
export function stripMentionAt(html: string): string {
  return html.replace(/(<span\b[^>]*data-type="mention"[^>]*>)\s*@/gi, "$1");
}
