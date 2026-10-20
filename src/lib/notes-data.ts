import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clipJumpHref } from "@/lib/clips";
import { LINK_COLUMN, noteTitle, type LinkKind, type NoteFolder, type NoteLinkView, type NoteView } from "@/lib/notes";

type LinkRow = {
  id: string;
  note_id: string;
  character_id: string | null;
  wiki_page_id: string | null;
  story_post_id: string | null;
  clip_id: string | null;
  linked_note_id: string | null;
};
type NoteRow = { id: string; title: string; body: string; pinned: boolean; tags: string[] | null; folder_id: string | null; world_id: string | null; updated_at: string };

const LINK_COLS = "id, note_id, character_id, wiki_page_id, story_post_id, clip_id, linked_note_id";
const NOTE_COLS = "id, title, body, pinned, tags, folder_id, world_id, updated_at";

function rowTarget(r: LinkRow): { kind: LinkKind; id: string } {
  if (r.character_id) return { kind: "character", id: r.character_id };
  if (r.wiki_page_id) return { kind: "wiki", id: r.wiki_page_id };
  if (r.story_post_id) return { kind: "scene", id: r.story_post_id };
  if (r.clip_id) return { kind: "clip", id: r.clip_id };
  return { kind: "note", id: r.linked_note_id as string };
}

// Namen, Bilder und Adressen der Ziele (jede Tabelle einmal; was die Person nicht mehr sehen darf, fehlt und gilt als „nicht mehr da“)
export async function resolveLinks(supabase: SupabaseClient, rows: LinkRow[]): Promise<Map<string, NoteLinkView[]>> {
  const ids = (kind: LinkKind) => [...new Set(rows.map(rowTarget).filter((t) => t.kind === kind).map((t) => t.id))];
  const [chars, wikis, scenes, clips, notes, clipChars] = await Promise.all([
    ids("character").length ? supabase.from("characters").select("id, name, avatar_url").in("id", ids("character")) : { data: [] },
    ids("wiki").length ? supabase.from("wiki_pages").select("id, title").in("id", ids("wiki")) : { data: [] },
    ids("scene").length ? supabase.from("story_posts").select("id, title").in("id", ids("scene")) : { data: [] },
    ids("clip").length ? supabase.from("scene_clips").select("id, title, story_post_id, items").in("id", ids("clip")) : { data: [] },
    ids("note").length ? supabase.from("notes").select("id, title, body").in("id", ids("note")) : { data: [] },
    ids("clip").length ? supabase.from("clip_collection_items").select("clip_id, clip_collections(character_id)").in("clip_id", ids("clip")) : { data: [] },
  ]);
  const byId = <T extends { id: string }>(list: unknown) => new Map(((list as T[] | null) ?? []).map((x) => [x.id, x]));
  const cm = byId<{ id: string; name: string; avatar_url: string | null }>(chars.data);
  const wm = byId<{ id: string; title: string }>(wikis.data);
  const sm = byId<{ id: string; title: string }>(scenes.data);
  const km = byId<{ id: string; title: string; story_post_id: string | null; items: { id: string }[] }>(clips.data);
  const nm = byId<{ id: string; title: string; body: string }>(notes.data);
  // In welchem Charakterbogen (Sammlung) liegt der Ausschnitt? Dorthin führt die Verknüpfung.
  const clipCharacter = new Map<string, string>();
  for (const r of ((clipChars.data ?? []) as unknown as { clip_id: string; clip_collections: { character_id: string } | { character_id: string }[] | null }[])) {
    const col = Array.isArray(r.clip_collections) ? r.clip_collections[0] : r.clip_collections;
    if (col && !clipCharacter.has(r.clip_id)) clipCharacter.set(r.clip_id, col.character_id);
  }

  const out = new Map<string, NoteLinkView[]>();
  for (const r of rows) {
    const t = rowTarget(r);
    let view: NoteLinkView;
    if (t.kind === "character") {
      const c = cm.get(t.id);
      view = { id: r.id, kind: t.kind, targetId: t.id, label: c?.name ?? "Charakter", href: c ? `/characters/${t.id}` : null, avatar: c?.avatar_url, missing: !c };
    } else if (t.kind === "wiki") {
      const w = wm.get(t.id);
      view = { id: r.id, kind: t.kind, targetId: t.id, label: w?.title ?? "Wiki-Seite", href: w ? `/wiki/${t.id}` : null, missing: !w };
    } else if (t.kind === "scene") {
      const s = sm.get(t.id);
      view = { id: r.id, kind: t.kind, targetId: t.id, label: s?.title ?? "Szene", href: s ? `/story/${t.id}` : null, missing: !s };
    } else if (t.kind === "clip") {
      const k = km.get(t.id);
      const owner = clipCharacter.get(t.id);
      const href = owner ? `/characters/${owner}/chabo?ausschnitt=${t.id}` : k?.story_post_id ? clipJumpHref(k.story_post_id, (k.items ?? []).map((i) => i.id)) : null;
      view = { id: r.id, kind: t.kind, targetId: t.id, label: k?.title ?? "Ausschnitt", href, missing: !k };
    } else {
      const n = nm.get(t.id);
      view = { id: r.id, kind: t.kind, targetId: t.id, label: n ? noteTitle(n) : "Notiz", href: n ? `/notizen/${t.id}` : null, missing: !n };
    }
    const list = out.get(r.note_id) ?? [];
    list.push(view);
    out.set(r.note_id, list);
  }
  return out;
}

export async function listNotes(supabase: SupabaseClient, userId: string): Promise<NoteView[]> {
  const { data } = await supabase.from("notes").select(NOTE_COLS).eq("user_id", userId).order("pinned", { ascending: false }).order("updated_at", { ascending: false }).limit(500);
  const notes = (data ?? []) as NoteRow[];
  if (notes.length === 0) return [];
  const { data: links } = await supabase.from("note_links").select(LINK_COLS).eq("user_id", userId).in("note_id", notes.map((n) => n.id)).order("created_at");
  const resolved = await resolveLinks(supabase, (links ?? []) as LinkRow[]);
  return notes.map((n) => toView(n, resolved.get(n.id) ?? []));
}

export async function getNote(supabase: SupabaseClient, userId: string, id: string): Promise<NoteView | null> {
  const { data } = await supabase.from("notes").select(NOTE_COLS).eq("id", id).eq("user_id", userId).maybeSingle<NoteRow>();
  if (!data) return null;
  const { data: links } = await supabase.from("note_links").select(LINK_COLS).eq("note_id", id).order("created_at");
  const resolved = await resolveLinks(supabase, (links ?? []) as LinkRow[]);
  return toView(data, resolved.get(id) ?? []);
}

// Notizen, die auf ein Ziel zeigen (Charakter, Wiki-Seite, Szene …), neueste zuerst
export async function notesForTarget(supabase: SupabaseClient, userId: string, kind: LinkKind, targetId: string): Promise<{ id: string; title: string; body: string; updatedAt: string }[]> {
  const { data: links } = await supabase.from("note_links").select("note_id").eq("user_id", userId).eq(LINK_COLUMN[kind], targetId).limit(100);
  const ids = (links ?? []).map((l) => (l as { note_id: string }).note_id);
  if (ids.length === 0) return [];
  const { data } = await supabase.from("notes").select(NOTE_COLS).in("id", ids).order("updated_at", { ascending: false });
  return ((data ?? []) as NoteRow[]).map((n) => ({ id: n.id, title: noteTitle(n), body: n.body, updatedAt: n.updated_at }));
}

// Zahl der Notizen je Ziel (für die kleine Zahl am Notiz-Symbol)
export async function noteCountForTarget(supabase: SupabaseClient, userId: string, kind: LinkKind, targetId: string): Promise<number> {
  const { count } = await supabase.from("note_links").select("id", { count: "exact", head: true }).eq("user_id", userId).eq(LINK_COLUMN[kind], targetId);
  return count ?? 0;
}

// Notizen, die diese Notiz verlinken
export async function backlinks(supabase: SupabaseClient, userId: string, noteId: string): Promise<{ id: string; title: string }[]> {
  const { data: links } = await supabase.from("note_links").select("note_id").eq("user_id", userId).eq("linked_note_id", noteId);
  const ids = (links ?? []).map((l) => (l as { note_id: string }).note_id);
  if (ids.length === 0) return [];
  const { data } = await supabase.from("notes").select("id, title, body").in("id", ids);
  return ((data ?? []) as { id: string; title: string; body: string }[]).map((n) => ({ id: n.id, title: noteTitle(n) }));
}

function toView(n: NoteRow, links: NoteLinkView[]): NoteView {
  return { id: n.id, title: n.title, body: n.body, pinned: n.pinned, tags: n.tags ?? [], folderId: n.folder_id, worldId: n.world_id, updatedAt: n.updated_at, links };
}

export async function listFolders(supabase: SupabaseClient, userId: string): Promise<NoteFolder[]> {
  const { data } = await supabase.from("note_folders").select("id, name").eq("user_id", userId).order("position").order("name");
  return (data ?? []) as NoteFolder[];
}

// Alle eigenen Tags (für die Vorschläge in der Notiz)
export async function listTags(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await supabase.from("notes").select("tags").eq("user_id", userId).limit(1000);
  return [...new Set(((data ?? []) as { tags: string[] | null }[]).flatMap((n) => n.tags ?? []))].sort((a, b) => a.localeCompare(b, "de"));
}
