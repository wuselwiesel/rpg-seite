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
  tags: string[];
  folderId: string | null;
  worldId: string | null;
  updatedAt: string;
  links: NoteLinkView[];
};

export type NoteFolder = { id: string; name: string };

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

export const MAX_NOTE_TAGS = 12;

// Tag: klein, ohne #, nur Buchstaben, Ziffern und _ - (höchstens 30 Zeichen)
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 30);
}

export function normalizeTags(raw: string[]): string[] {
  return [...new Set(raw.map(normalizeTag).filter(Boolean))].slice(0, MAX_NOTE_TAGS);
}

// Suche: „#tag“ filtert nach Tag, sonst Titel, Text, Tags und Namen der Verknüpfungen
export function noteMatches(n: NoteView, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  if (term.startsWith("#")) return n.tags.includes(normalizeTag(term));
  return [n.title, stripHtml(n.body), ...n.tags, ...n.links.map((l) => l.label)].some((s) => s.toLowerCase().includes(term));
}

// Im Text benannte Ziele: [[Titel]] / [[Titel|Anzeigetext]] (Wiki-Seiten) und @-Erwähnungen (Charaktere)
export function inlineTargets(html: string): { wikiTitles: string[]; characterIds: string[] } {
  const wikiTitles = new Set<string>();
  for (const m of html.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
    const t = m[1].trim();
    if (t) wikiTitles.add(t);
  }
  const characterIds = new Set<string>();
  for (const m of html.matchAll(/<span\b([^>]*)>/g)) {
    if (!/data-type="mention"/.test(m[1])) continue;
    const id = /data-id="([0-9a-f-]{36})"/.exec(m[1])?.[1];
    if (id) characterIds.add(id);
  }
  return { wikiTitles: [...wikiTitles].slice(0, 40), characterIds: [...characterIds].slice(0, 40) };
}

// #Tags im Fließtext (wie in Bear): beginnt mit einem Buchstaben, steht am Wortanfang
export function inlineTags(html: string): string[] {
  const text = stripHtml(html);
  const found: string[] = [];
  for (const m of text.matchAll(/(?:^|[\s(])#([\p{L}][\p{L}\p{N}_-]{0,29})/gu)) found.push(m[1]);
  return normalizeTags(found);
}

// ---- Aufgaben („Offene Fäden“) ----
export type NoteTask = { index: number; text: string; checked: boolean };

const TASK_OPEN = /<li data-type="taskItem" data-checked="(true|false)">/g;

// Alle Aufgaben einer Notiz in Textreihenfolge; Text = erster Absatz der Aufgabe
export function noteTasks(html: string): NoteTask[] {
  const out: NoteTask[] = [];
  let i = 0;
  for (const m of html.matchAll(TASK_OPEN)) {
    const rest = html.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 4000);
    const para = /<div>\s*<p>([\s\S]*?)<\/p>/.exec(rest)?.[1] ?? "";
    out.push({ index: i++, text: stripHtml(para), checked: m[1] === "true" });
  }
  return out;
}

export function openTasks(html: string): NoteTask[] {
  return noteTasks(html).filter((t) => !t.checked && t.text);
}

// Setzt oder löscht den Haken der n-ten Aufgabe (Kästchen und data-checked bleiben im Einklang)
export function setTaskInHtml(html: string, index: number, checked: boolean): string | null {
  let i = 0;
  let result: string | null = null;
  const re = new RegExp(TASK_OPEN.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (i++ !== index) continue;
    const head = html.slice(0, m.index);
    const afterLi = html.slice(m.index + m[0].length);
    const input = /<input\b[^>]*>/.exec(afterLi);
    const newInput = input ? input[0].replace(/\s+checked(="[^"]*")?/g, "").replace(/\s*\/?>$/, checked ? ' checked="checked" />' : " />") : "";
    const rest = input ? afterLi.slice(0, input.index) + newInput + afterLi.slice(input.index + input[0].length) : afterLi;
    result = `${head}<li data-type="taskItem" data-checked="${checked}">${rest}`;
    break;
  }
  return result;
}
