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
  archived: boolean;
  deletedAt: string | null;
  tags: string[];
  folderId: string | null;
  isTemplate: boolean;
  worldId: string | null;
  createdAt?: string;
  updatedAt: string;
  links: NoteLinkView[];
};

export type NoteFolder = { id: string; name: string; parentId: string | null };

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

// Tag: klein, ohne #, nur Buchstaben, Ziffern und _ - (höchstens 60 Zeichen); „/“ verschachtelt (plot/nebelhafen, höchstens 3 Ebenen)
export function normalizeTag(raw: string): string {
  const cleaned = raw.trim().replace(/^#+/, "").toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}_/-]/gu, "");
  return cleaned.split("/").filter(Boolean).slice(0, 3).join("/").slice(0, 60);
}

// Gehört der Tag zum gewählten Tag (er selbst oder ein Unter-Tag: „plot“ trifft „plot/nebelhafen“)?
export function tagMatches(tag: string, selected: string): boolean {
  return tag === selected || tag.startsWith(`${selected}/`);
}

export function normalizeTags(raw: string[]): string[] {
  return [...new Set(raw.map(normalizeTag).filter(Boolean))].slice(0, MAX_NOTE_TAGS);
}

// Suche: „#tag“ filtert nach Tag, sonst Titel, Text, Tags und Namen der Verknüpfungen
export function noteMatches(n: NoteView, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  if (term.startsWith("#")) return n.tags.some((t) => tagMatches(t, normalizeTag(term)));
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
  for (const m of text.matchAll(/(?:^|[\s(])#([\p{L}][\p{L}\p{N}_/-]{0,59})/gu)) found.push(m[1]);
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

// ---- Ordnerbaum (höchstens drei Ebenen) ----
export const MAX_FOLDER_DEPTH = 3;

const byFolderName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "de");

export type FolderNode = NoteFolder & { depth: number; children: FolderNode[] };

export function buildFolderTree(folders: NoteFolder[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>(folders.map((f) => [f.id, { ...f, depth: 1, children: [] }]));
  const roots: FolderNode[] = [];
  for (const n of nodes.values()) {
    const parent = n.parentId ? nodes.get(n.parentId) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  const walk = (list: FolderNode[], depth: number) => {
    list.sort(byFolderName);
    for (const n of list) {
      n.depth = depth;
      walk(n.children, depth + 1);
    }
  };
  walk(roots, 1);
  return roots;
}

// Alle Ordner in Baumreihenfolge (Elternordner vor ihren Unterordnern), z. B. für Auswahlfelder
export function flattenFolders(folders: NoteFolder[]): FolderNode[] {
  const out: FolderNode[] = [];
  const walk = (list: FolderNode[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(buildFolderTree(folders));
  return out;
}

// Kette vom obersten Ordner bis zu diesem
export function folderPath(folders: NoteFolder[], id: string): NoteFolder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: NoteFolder[] = [];
  const seen = new Set<string>();
  let cur = byId.get(id);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

// Der Ordner selbst und alles darunter
export function descendantIds(folders: NoteFolder[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
        out.add(f.id);
        grew = true;
      }
    }
  }
  return out;
}

// Tiefe des tiefsten Unterordners unter diesem Ordner (1 = nur er selbst)
export function subtreeHeight(folders: NoteFolder[], id: string): number {
  const ids = descendantIds(folders, id);
  return Math.max(...[...ids].map((x) => folderPath(folders, x).length - folderPath(folders, id).length + 1));
}

// Darf der Ordner unter „parentId“ (null = oberste Ebene) liegen? Kein Kreis, höchstens MAX_FOLDER_DEPTH Ebenen
export function canMoveFolder(folders: NoteFolder[], id: string, parentId: string | null): boolean {
  if (parentId === id) return false;
  if (parentId && descendantIds(folders, id).has(parentId)) return false;
  const parentDepth = parentId ? folderPath(folders, parentId).length : 0;
  return parentDepth + subtreeHeight(folders, id) <= MAX_FOLDER_DEPTH;
}
