import { stripHtml } from "@/lib/strip-html";

// Notizbuch: Typen und Hilfen, die Server und Browser gemeinsam nutzen.
export type LinkKind = "character" | "wiki" | "scene" | "clip" | "note";

export const LINK_KINDS: { kind: LinkKind; label: string; plural: string }[] = [
  { kind: "character", label: "Charakter", plural: "Charaktere" },
  { kind: "wiki", label: "Wiki-Seite", plural: "Wiki" },
  { kind: "scene", label: "Szene", plural: "Szenen" },
  { kind: "clip", label: "Ausschnitt", plural: "Ausschnitte" },
  { kind: "note", label: "Notiz", plural: "Notizen" },
];

export const LINK_COLUMN: Record<LinkKind, "character_id" | "wiki_page_id" | "story_post_id" | "clip_id" | "linked_note_id"> = {
  character: "character_id",
  wiki: "wiki_page_id",
  scene: "story_post_id",
  clip: "clip_id",
  note: "linked_note_id",
};

export type NoteLinkView = {
  id: string;
  kind: LinkKind;
  targetId: string;
  label: string;
  href: string | null;
  avatar?: string | null;
  // Ziel gelöscht oder nicht mehr sichtbar
  missing?: boolean;
};

export type NoteView = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  worldId: string | null;
  updatedAt: string;
  links: NoteLinkView[];
};

export type LinkTarget = { kind: LinkKind; id: string; label: string; sub?: string; avatar?: string | null };

export function noteTitle(n: { title: string; body: string }): string {
  if (n.title.trim()) return n.title.trim();
  const first = stripHtml(n.body).slice(0, 60);
  return first || "Ohne Titel";
}

export function noteSnippet(body: string, max = 140): string {
  const t = stripHtml(body);
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function isLinkKind(v: unknown): v is LinkKind {
  return v === "character" || v === "wiki" || v === "scene" || v === "clip" || v === "note";
}

export function noteMatches(n: NoteView, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return [n.title, stripHtml(n.body), ...n.links.map((l) => l.label)].some((s) => s.toLowerCase().includes(term));
}
