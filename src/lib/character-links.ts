import { stripHtml } from "@/lib/strip-html";

// Charaktere im Wiki: @-Erwähnungen im Text und [[Name]], wenn es keine Wiki-Seite mit diesem Namen gibt.
// Sie werden zu Links mit Hover-Vorschau (dieselbe Ebene wie bei Wiki-Links, siehe wiki-preview-layer.tsx).

export type CharacterTerm = { id: string; name: string; avatarUrl: string | null; excerpt: string };

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function characterExcerpt(bio: string | null | undefined, fallback = ""): string {
  const text = stripHtml(bio ?? "").trim();
  if (!text) return fallback;
  return text.length > 200 ? `${text.slice(0, 197)}...` : text;
}

export function characterAnchor(c: CharacterTerm, label: string): string {
  return (
    `<a class="wiki-link wiki-char" href="/characters/${c.id}" data-wiki-title="${escapeHtml(c.name)}" data-wiki-cat="Charakter"` +
    ` data-wiki-excerpt="${escapeHtml(c.excerpt)}"` +
    (c.avatarUrl ? ` data-wiki-cover="${escapeHtml(c.avatarUrl)}"` : "") +
    `>${label}</a>`
  );
}

// <span data-type="mention" data-id="…">@Name</span> (so speichert der Editor eine Erwähnung) -> Link mit Vorschau.
// Unbekannte Personen bleiben unverändert.
export function linkCharacterMentions(html: string, byId: Map<string, CharacterTerm>): string {
  if (!html.includes('data-type="mention"')) return html;
  return html.replace(/<span\b([^>]*)>([^<]*)<\/span>/g, (whole, attrs: string, inner: string) => {
    if (!/data-type="mention"/.test(attrs)) return whole;
    const id = /data-id="([0-9a-f-]{36})"/.exec(attrs)?.[1];
    const c = id ? byId.get(id) : undefined;
    return c ? characterAnchor(c, inner) : whole;
  });
}

export function characterIndex(characters: CharacterTerm[]): Map<string, CharacterTerm> {
  const map = new Map<string, CharacterTerm>();
  for (const c of characters) if (!map.has(c.name.trim().toLowerCase())) map.set(c.name.trim().toLowerCase(), c);
  return map;
}

// Muster für ilike: % _ \ im Namen sind sonst Platzhalter.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}
