"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { sanitizePostHtml } from "@/lib/sanitize";
import { escapePostgrestValue } from "@/lib/postgrest";
import { LINK_COLUMN, MAX_FOLDER_DEPTH, canMoveFolder, folderPath, normalizeTag, inlineTags, inlineTargets, isLinkKind, noteTitle, normalizeTags, setTaskInHtml, type LinkKind, type LinkTarget, type NoteFolder, type NoteLinkView } from "@/lib/notes";
import { getFaceclaimNames } from "@/lib/faceclaim-data";
import { markdownToHtml } from "@/lib/note-markdown";
import { notesForTarget, resolveLinks } from "@/lib/notes-data";
import { BUILTIN_TEMPLATES, uncheckTasks } from "@/lib/note-templates";
import { loadEntryItems, pickExcerptItems } from "@/lib/clip-server";
import { escapeHtml } from "@/lib/character-links";
import { stripHtml } from "@/lib/strip-html";

const LINK_ROW = "id, note_id, character_id, wiki_page_id, story_post_id, clip_id, linked_note_id";
type LinkRow = Parameters<typeof resolveLinks>[1][number];

type Result<T = object> = ({ error: string } & Partial<T>) | ({ error?: undefined } & T);

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const textToHtml = (t: string) => `<p>${t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`;

// Neue Notiz, optional gleich mit einer Verknüpfung (von Charakter, Wiki-Seite, Szene … aus) und Anfangstext
export async function createNote(input: { title?: string; text?: string; bodyHtml?: string; folderId?: string | null; link?: { kind: LinkKind; id: string } } = {}): Promise<Result<{ id: string }>> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  const world = await getActiveWorld(user.id);
  const body = input.bodyHtml !== undefined ? sanitizePostHtml(input.bodyHtml) : (input.text?.trim() ? sanitizePostHtml(textToHtml(input.text.trim())) : "");
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: user.id, world_id: world?.id ?? null, folder_id: input.folderId ?? null, title: (input.title ?? "").trim().slice(0, 200), body })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: error?.message ?? "Konnte nicht angelegt werden." };
  if (input.link && isLinkKind(input.link.kind)) {
    const { error: linkErr } = await supabase.from("note_links").insert({ note_id: data.id, user_id: user.id, [LINK_COLUMN[input.link.kind]]: input.link.id });
    if (linkErr) return { error: linkErr.message };
  }
  revalidatePath("/notizen");
  return { id: data.id };
}

// Pfade aus Dateianhängen und privaten Bildern im Notiz-HTML extrahieren (für Storage-Cleanup).
function extractNoteStoragePaths(html: string): Set<string> {
  const paths = new Set<string>();
  for (const m of html.matchAll(/href="\/notizen\/datei\?p=([^"]+)"/g)) {
    try { paths.add(decodeURIComponent(m[1])); } catch { /* ungültiger Pfad */ }
  }
  for (const m of html.matchAll(/src="\/notizen\/bild\?p=([^"]+)"/g)) {
    try { paths.add(decodeURIComponent(m[1])); } catch { /* ungültiger Pfad */ }
  }
  return paths;
}

// Speichert Titel und Text. Im Text genannte Seiten ([[Titel]]) und Charaktere (@Name) werden dabei von selbst verknüpft;
// Rückgabe: die aktuelle Liste der Verknüpfungen, falls neue dazugekommen sind.
export async function saveNote(id: string, input: { title: string; body: string; tags?: string[] }): Promise<{ error: string } | { links: NoteLinkView[] | null; tags: string[] }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  const body = sanitizePostHtml(input.body);
  if (body.length > 100000) return { error: "Die Notiz ist zu lang." };

  // Alten Body holen, um danach gelöschte Dateien/Bilder aus dem Storage zu entfernen
  const { data: oldNote } = await supabase.from("notes").select("body").eq("id", id).eq("user_id", user.id).maybeSingle<{ body: string }>();

  // #Tags im Text kommen zu den eingetragenen Tags dazu (nie weniger als vorher)
  const tags = normalizeTags([...(input.tags ?? []), ...inlineTags(body)]);
  const { data: note, error } = await supabase
    .from("notes")
    .update({ title: input.title.trim().slice(0, 200), body, ...(input.tags ? { tags } : {}), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("world_id")
    .maybeSingle<{ world_id: string | null }>();
  if (error) return { error: error.message };
  if (!note) return { error: "Notiz nicht gefunden." };

  // Dateien und Bilder löschen, die im neuen Body nicht mehr vorkommen
  if (oldNote?.body) {
    const oldPaths = extractNoteStoragePaths(oldNote.body);
    const newPaths = extractNoteStoragePaths(body);
    const removed = [...oldPaths].filter((p) => !newPaths.has(p) && p.startsWith(`${user.id}/`));
    if (removed.length > 0) await supabase.storage.from("note-files").remove(removed);
  }

  revalidatePath("/notizen");

  const { wikiTitles, characterIds } = inlineTargets(body);
  if (wikiTitles.length === 0 && characterIds.length === 0) return { links: null, tags };
  const wanted: { kind: LinkKind; id: string }[] = [];
  if (wikiTitles.length > 0) {
    let q = supabase.from("wiki_pages").select("id").in("title", wikiTitles);
    if (note.world_id) q = q.eq("world_id", note.world_id);
    const { data } = await q.limit(80);
    for (const w of (data ?? []) as { id: string }[]) wanted.push({ kind: "wiki", id: w.id });
  }
  if (characterIds.length > 0) {
    const { data } = await supabase.from("characters").select("id").in("id", characterIds);
    for (const c of (data ?? []) as { id: string }[]) wanted.push({ kind: "character", id: c.id });
  }
  if (wanted.length === 0) return { links: null, tags };

  // Nur ergänzen, nie entfernen (von Hand gesetzte Verknüpfungen bleiben); die Eindeutigkeit gilt je Art über Teilindizes, daher einzeln prüfen
  const { data: existing } = await supabase.from("note_links").select("character_id, wiki_page_id").eq("note_id", id);
  const have = new Set(((existing ?? []) as { character_id: string | null; wiki_page_id: string | null }[]).map((l) => (l.character_id ? `character:${l.character_id}` : `wiki:${l.wiki_page_id}`)));
  const missing = wanted.filter((t) => !have.has(`${t.kind}:${t.id}`));
  if (missing.length === 0) return { links: null, tags };
  const { error: linkErr } = await supabase.from("note_links").insert(missing.map((t) => ({ note_id: id, user_id: user.id, [LINK_COLUMN[t.kind]]: t.id })));
  if (linkErr) return { links: null, tags };
  const { data: all } = await supabase.from("note_links").select("id, note_id, character_id, wiki_page_id, story_post_id, clip_id, linked_note_id").eq("note_id", id).order("created_at");
  const resolved = await resolveLinks(supabase, (all ?? []) as Parameters<typeof resolveLinks>[1]);
  return { links: resolved.get(id) ?? [], tags };
}

export async function setNotePinned(id: string, pinned: boolean): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.from("notes").update({ pinned }).eq("id", id).eq("user_id", user.id);
  if (error) return error.message;
  revalidatePath("/notizen");
  revalidatePath(`/notizen/${id}`);
  return null;
}

export async function deleteNote(id: string): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id);
  if (error) return error.message;
  revalidatePath("/notizen");
  return null;
}

export async function addNoteLink(noteId: string, kind: LinkKind, targetId: string): Promise<{ link: NoteLinkView } | { error: string }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  if (!isLinkKind(kind) || !/^[0-9a-f-]{36}$/i.test(targetId)) return { error: "Ungültiges Ziel." };
  const { data, error } = await supabase
    .from("note_links")
    .insert({ note_id: noteId, user_id: user.id, [LINK_COLUMN[kind]]: targetId })
    .select(LINK_ROW)
    .single<LinkRow>();
  let row = data;
  if (!row && error?.code === "23505") {
    const { data: existing } = await supabase.from("note_links").select(LINK_ROW).eq("note_id", noteId).eq(LINK_COLUMN[kind], targetId).maybeSingle<LinkRow>();
    row = existing;
  }
  if (!row) return { error: error?.code === "23503" ? "Das Ziel gibt es nicht mehr." : (error?.message ?? "Konnte nicht verknüpft werden.") };
  const link = (await resolveLinks(supabase, [row])).get(noteId)?.[0];
  if (!link) return { error: "Konnte nicht verknüpft werden." };
  revalidatePath(`/notizen/${noteId}`);
  revalidatePath("/notizen");
  return { link };
}

export async function removeNoteLink(linkId: string, noteId: string): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.from("note_links").delete().eq("id", linkId).eq("user_id", user.id);
  if (error) return error.message;
  revalidatePath(`/notizen/${noteId}`);
  revalidatePath("/notizen");
  return null;
}

// Suche für die Verknüpfungs-Auswahl: alles, was die Person sehen darf, bevorzugt in der aktiven Welt
export async function searchLinkTargets(q: string, kind: LinkKind, excludeNoteId?: string): Promise<LinkTarget[]> {
  const { supabase, user } = await authed();
  if (!user) return [];
  const term = escapePostgrestValue(q.trim().slice(0, 80));
  const world = await getActiveWorld(user.id);
  const LIMIT = 12;

  if (kind === "character") {
    let query = supabase.from("characters").select("id, name, username, avatar_url, is_npc, worlds(name)").is("deleted_at", null);
    if (term) query = query.or(`name.ilike.%${term}%,username.ilike.%${term}%`);
    else if (world) query = query.eq("world_id", world.id);
    const { data } = await query.order("name").limit(LIMIT);
    const faceclaims = await getFaceclaimNames(supabase, user.id, ((data ?? []) as { id: string }[]).map((c) => c.id));
    return ((data ?? []) as unknown as { id: string; name: string; username: string | null; avatar_url: string | null; is_npc: boolean; worlds: { name: string } | { name: string }[] | null }[]).map((c) => ({
      kind,
      id: c.id,
      label: c.name,
      sub: [c.username ? `@${c.username}` : null, c.is_npc ? "NPC" : null, (Array.isArray(c.worlds) ? c.worlds[0] : c.worlds)?.name, faceclaims.get(c.id) ? `Faceclaim: ${faceclaims.get(c.id)}` : null].filter(Boolean).join(" · "),
      avatar: c.avatar_url,
    }));
  }
  if (kind === "wiki") {
    let query = supabase.from("wiki_pages").select("id, title, worlds(name)");
    if (term) query = query.ilike("title", `%${term}%`);
    else if (world) query = query.eq("world_id", world.id);
    const { data } = await query.order(term ? "title" : "updated_at", { ascending: !!term }).limit(LIMIT);
    return ((data ?? []) as unknown as { id: string; title: string; worlds: { name: string } | { name: string }[] | null }[]).map((w) => ({ kind, id: w.id, label: w.title, sub: (Array.isArray(w.worlds) ? w.worlds[0] : w.worlds)?.name }));
  }
  if (kind === "scene") {
    let query = supabase.from("story_posts").select("id, title, location, worlds(name)");
    if (term) query = query.or(`title.ilike.%${term}%,location.ilike.%${term}%`);
    else if (world) query = query.eq("world_id", world.id);
    const { data } = await query.order("created_at", { ascending: false }).limit(LIMIT);
    return ((data ?? []) as unknown as { id: string; title: string; location: string | null; worlds: { name: string } | { name: string }[] | null }[]).map((s) => ({
      kind,
      id: s.id,
      label: s.title,
      sub: [s.location, (Array.isArray(s.worlds) ? s.worlds[0] : s.worlds)?.name].filter(Boolean).join(" · "),
    }));
  }
  if (kind === "clip") {
    let query = supabase.from("scene_clips").select("id, title, scene_title").eq("owner_id", user.id);
    if (term) query = query.or(`title.ilike.%${term}%,scene_title.ilike.%${term}%`);
    const { data } = await query.order("created_at", { ascending: false }).limit(LIMIT);
    return ((data ?? []) as { id: string; title: string; scene_title: string }[]).map((c) => ({ kind, id: c.id, label: c.title, sub: c.scene_title || undefined }));
  }
  let query = supabase.from("notes").select("id, title, body").eq("user_id", user.id);
  if (excludeNoteId) query = query.neq("id", excludeNoteId);
  if (term) query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  const { data } = await query.order("updated_at", { ascending: false }).limit(LIMIT);
  return ((data ?? []) as { id: string; title: string; body: string }[]).map((n) => ({ kind: "note", id: n.id, label: noteTitle(n) }));
}

// Notizen zu einem Ziel (für das kleine Notiz-Fenster an Charakter, Wiki-Seite und Szene)
export async function loadTargetNotes(kind: LinkKind, targetId: string) {
  const { supabase, user } = await authed();
  if (!user) return [];
  return notesForTarget(supabase, user.id, kind, targetId);
}

// Markierte Textstellen oder ganze Nachrichten einer Szene als Notiz ablegen (als Zitat gesetzt, mit Quelle) und mit der Szene verknüpfen
export async function createNoteFromScene(input: { storyPostId: string; entryIds: string[]; excerpts?: Record<string, string> }): Promise<Result<{ id: string }>> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  const items = await loadEntryItems(supabase, input.storyPostId, input.entryIds);
  if (!items.length) return { error: "Die Nachrichten wurden nicht gefunden." };
  let parts: { author: string; html: string }[];
  if (input.excerpts && Object.keys(input.excerpts).length > 0) {
    const picked = pickExcerptItems(items, input.excerpts);
    if ("error" in picked) return picked;
    parts = picked.map((p) => ({ author: p.author, html: `<p>${escapeHtml(p.text).replace(/\n/g, "<br>")}</p>` }));
  } else {
    parts = items.map((i) => ({ author: i.author, html: i.html }));
  }
  const { data: scene } = await supabase.from("story_posts").select("title").eq("id", input.storyPostId).maybeSingle<{ title: string }>();
  const source = scene?.title ? `${escapeHtml(scene.title)}` : "Szene";
  const body = sanitizePostHtml(
    parts.map((p) => `<blockquote>${p.html}</blockquote><p><em>– ${escapeHtml(p.author)}, ${source}</em></p>`).join("") + "<p></p>",
  );
  const title = scene?.title ? `Aus: ${scene.title}`.slice(0, 200) : stripHtml(parts[0].html).slice(0, 60);
  return createNote({ title, bodyHtml: body, link: { kind: "scene", id: input.storyPostId } });
}

async function loadFolders(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<NoteFolder[]> {
  const { data } = await supabase.from("note_folders").select("id, name, parent_id").eq("user_id", userId);
  return ((data ?? []) as { id: string; name: string; parent_id: string | null }[]).map((f) => ({ id: f.id, name: f.name, parentId: f.parent_id }));
}

export async function createNoteFolder(name: string, parentId: string | null = null): Promise<{ error: string } | { folder: NoteFolder }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  const clean = name.trim().slice(0, 60);
  if (!clean) return { error: "Bitte einen Namen eingeben." };
  if (parentId) {
    const all = await loadFolders(supabase, user.id);
    if (!all.some((f) => f.id === parentId)) return { error: "Der Ordner existiert nicht mehr." };
    if (folderPath(all, parentId).length >= MAX_FOLDER_DEPTH) return { error: `Ordner lassen sich höchstens ${MAX_FOLDER_DEPTH} Ebenen tief verschachteln.` };
  }
  const { data, error } = await supabase.from("note_folders").insert({ user_id: user.id, name: clean, parent_id: parentId }).select("id, name, parent_id").single<{ id: string; name: string; parent_id: string | null }>();
  if (error || !data) return { error: error?.code === "23505" ? "Diesen Ordner gibt es hier schon." : (error?.message ?? "Konnte nicht angelegt werden.") };
  revalidatePath("/notizen");
  return { folder: { id: data.id, name: data.name, parentId: data.parent_id } };
}

// Ordner verschieben (null = oberste Ebene): kein Kreis, höchstens drei Ebenen
export async function moveNoteFolder(id: string, parentId: string | null): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const all = await loadFolders(supabase, user.id);
  if (!all.some((f) => f.id === id)) return "Ordner nicht gefunden.";
  if (!canMoveFolder(all, id, parentId)) return "Dorthin lässt sich der Ordner nicht verschieben.";
  const { error } = await supabase.from("note_folders").update({ parent_id: parentId }).eq("id", id).eq("user_id", user.id);
  if (error) return error.code === "23505" ? "Dort gibt es schon einen Ordner mit diesem Namen." : error.message;
  revalidatePath("/notizen");
  return null;
}

export async function renameNoteFolder(id: string, name: string): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const clean = name.trim().slice(0, 60);
  if (!clean) return "Bitte einen Namen eingeben.";
  const { error } = await supabase.from("note_folders").update({ name: clean }).eq("id", id).eq("user_id", user.id);
  if (error) return error.code === "23505" ? "Diesen Ordner gibt es schon." : error.message;
  revalidatePath("/notizen");
  return null;
}

// Die Notizen im Ordner bleiben erhalten und stehen danach „ohne Ordner“
export async function deleteNoteFolder(id: string): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.from("note_folders").delete().eq("id", id).eq("user_id", user.id);
  if (error) return error.message;
  revalidatePath("/notizen");
  return null;
}

export async function moveNote(noteId: string, folderId: string | null): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.from("notes").update({ folder_id: folderId }).eq("id", noteId).eq("user_id", user.id);
  if (error) return error.message;
  revalidatePath("/notizen");
  return null;
}

// Haken einer Aufgabe in einer Notiz setzen oder löschen („Offene Fäden“)
export async function setNoteTask(noteId: string, index: number, checked: boolean): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const { data } = await supabase.from("notes").select("body").eq("id", noteId).eq("user_id", user.id).maybeSingle<{ body: string }>();
  if (!data) return "Notiz nicht gefunden.";
  const next = setTaskInHtml(data.body, index, checked);
  if (next === null) return "Die Aufgabe gibt es nicht mehr. Bitte neu laden.";
  const { error } = await supabase.from("notes").update({ body: sanitizePostHtml(next), updated_at: new Date().toISOString() }).eq("id", noteId).eq("user_id", user.id);
  if (error) return error.message;
  revalidatePath("/notizen");
  revalidatePath("/notizen/faeden");
  revalidatePath(`/notizen/${noteId}`);
  return null;
}

// Welt einer Notiz ändern (null = keine Welt, in allen Welten sichtbar)
export async function setNoteWorld(noteId: string, worldId: string | null): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  if (worldId) {
    const { data: member } = await supabase.from("world_members").select("world_id").eq("world_id", worldId).eq("user_id", user.id).maybeSingle();
    if (!member) return "Du bist nicht Mitglied dieser Welt.";
  }
  const { error } = await supabase.from("notes").update({ world_id: worldId }).eq("id", noteId).eq("user_id", user.id);
  if (error) return error.message;
  revalidatePath("/notizen");
  revalidatePath(`/notizen/${noteId}`);
  return null;
}

// ---- Vorlagen ----

// Aus einer Notiz eine Vorlage machen (Kopie ohne Verknüpfungen; Haken zurückgesetzt)
export async function saveNoteAsTemplate(noteId: string, title?: string): Promise<{ error: string } | { id: string }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  const { data: note } = await supabase.from("notes").select("title, body, tags").eq("id", noteId).eq("user_id", user.id).maybeSingle<{ title: string; body: string; tags: string[] | null }>();
  if (!note) return { error: "Notiz nicht gefunden." };
  const name = (title ?? note.title).trim().slice(0, 200) || "Vorlage";
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: user.id, title: name, body: uncheckTasks(note.body), tags: note.tags ?? [], is_template: true })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: error?.message ?? "Konnte nicht gespeichert werden." };
  revalidatePath("/notizen/vorlagen");
  return { id: data.id };
}

// Vorlage in eine normale Notiz zurückverwandeln (oder umgekehrt)
export async function setNoteIsTemplate(noteId: string, isTemplate: boolean): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.from("notes").update({ is_template: isTemplate }).eq("id", noteId).eq("user_id", user.id);
  if (error) return error.message;
  revalidatePath("/notizen");
  revalidatePath("/notizen/vorlagen");
  revalidatePath(`/notizen/${noteId}`);
  return null;
}

// Neue Notiz aus einer eigenen oder mitgelieferten Vorlage, optional im Ordner oder mit Verknüpfung
export async function createNoteFromTemplate(input: { templateId?: string; builtinId?: string; folderId?: string | null; link?: { kind: LinkKind; id: string } }): Promise<Result<{ id: string }>> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  let title = "";
  let body = "";
  let tags: string[] = [];
  if (input.builtinId) {
    const t = BUILTIN_TEMPLATES.find((b) => b.id === input.builtinId);
    if (!t) return { error: "Vorlage nicht gefunden." };
    ({ title, body, tags } = t);
  } else if (input.templateId) {
    const { data } = await supabase.from("notes").select("title, body, tags").eq("id", input.templateId).eq("user_id", user.id).eq("is_template", true).maybeSingle<{ title: string; body: string; tags: string[] | null }>();
    if (!data) return { error: "Vorlage nicht gefunden." };
    title = data.title;
    body = data.body;
    tags = data.tags ?? [];
  } else return { error: "Keine Vorlage gewählt." };
  const r = await createNote({ title, bodyHtml: uncheckTasks(body), folderId: input.folderId ?? null, link: input.link });
  if (r.error || !r.id) return r;
  if (tags.length > 0) await supabase.from("notes").update({ tags: normalizeTags(tags) }).eq("id", r.id).eq("user_id", user.id);
  return r;
}

// Eigene Vorlagen für das Auswahlmenü
export async function loadTemplateChoices(): Promise<{ id: string; title: string }[]> {
  const { supabase, user } = await authed();
  if (!user) return [];
  const { data } = await supabase.from("notes").select("id, title").eq("user_id", user.id).eq("is_template", true).order("updated_at", { ascending: false }).limit(50);
  return ((data ?? []) as { id: string; title: string }[]).map((t) => ({ id: t.id, title: t.title.trim() || "Vorlage" }));
}

// Mitgelieferte Vorlage als eigene Vorlage übernehmen
export async function adoptBuiltinTemplate(builtinId: string): Promise<{ error: string } | { id: string }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  const t = BUILTIN_TEMPLATES.find((b) => b.id === builtinId);
  if (!t) return { error: "Vorlage nicht gefunden." };
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: user.id, title: t.title, body: sanitizePostHtml(t.body), tags: t.tags, is_template: true })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: error?.message ?? "Konnte nicht gespeichert werden." };
  revalidatePath("/notizen/vorlagen");
  return { id: data.id };
}

// ---- Papierkorb und Archiv ----

async function setNoteFlags(id: string, patch: { deleted_at?: string | null; archived?: boolean }): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.from("notes").update(patch).eq("id", id).eq("user_id", user.id);
  if (error) return error.message;
  revalidatePath("/notizen");
  revalidatePath(`/notizen/${id}`);
  return null;
}

// In den Papierkorb (30 Tage, danach endgültig weg)
export async function trashNote(id: string): Promise<string | null> {
  return setNoteFlags(id, { deleted_at: new Date().toISOString() });
}

export async function restoreNote(id: string): Promise<string | null> {
  return setNoteFlags(id, { deleted_at: null });
}

export async function archiveNote(id: string, archived: boolean): Promise<string | null> {
  return setNoteFlags(id, { archived });
}

// Papierkorb leeren: alle eigenen Notizen darin endgültig löschen
export async function emptyTrash(): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.from("notes").delete().eq("user_id", user.id).not("deleted_at", "is", null);
  if (error) return error.message;
  revalidatePath("/notizen");
  return null;
}

// ---- Mehrfachauswahl ----

export type BulkOp =
  | { kind: "move"; folderId: string | null }
  | { kind: "addTag"; tag: string }
  | { kind: "removeTag"; tag: string }
  | { kind: "pin"; pinned: boolean }
  | { kind: "archive"; archived: boolean }
  | { kind: "trash" }
  | { kind: "restore" }
  | { kind: "delete" };

// Eine Änderung auf mehrere eigene Notizen anwenden (höchstens 200 auf einmal)
export async function bulkUpdateNotes(ids: string[], op: BulkOp): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const clean = [...new Set(ids.filter((i) => /^[0-9a-f-]{36}$/i.test(i)))].slice(0, 200);
  if (clean.length === 0) return "Keine Notizen gewählt.";
  let error: { message: string } | null = null;
  switch (op.kind) {
    case "move":
      ({ error } = await supabase.from("notes").update({ folder_id: op.folderId }).in("id", clean).eq("user_id", user.id));
      break;
    case "pin":
      ({ error } = await supabase.from("notes").update({ pinned: op.pinned }).in("id", clean).eq("user_id", user.id));
      break;
    case "archive":
      ({ error } = await supabase.from("notes").update({ archived: op.archived }).in("id", clean).eq("user_id", user.id));
      break;
    case "trash":
      ({ error } = await supabase.from("notes").update({ deleted_at: new Date().toISOString() }).in("id", clean).eq("user_id", user.id));
      break;
    case "restore":
      ({ error } = await supabase.from("notes").update({ deleted_at: null }).in("id", clean).eq("user_id", user.id));
      break;
    case "delete":
      ({ error } = await supabase.from("notes").delete().in("id", clean).eq("user_id", user.id).not("deleted_at", "is", null));
      break;
    case "addTag":
    case "removeTag": {
      const tag = normalizeTag(op.tag);
      if (!tag) return "Bitte einen Tag eingeben.";
      const { data } = await supabase.from("notes").select("id, tags").in("id", clean).eq("user_id", user.id);
      for (const n of (data ?? []) as { id: string; tags: string[] | null }[]) {
        const cur = n.tags ?? [];
        const next = op.kind === "addTag" ? normalizeTags([...cur, tag]) : cur.filter((t) => t !== tag);
        if (next.join() === cur.join()) continue;
        const r = await supabase.from("notes").update({ tags: next }).eq("id", n.id).eq("user_id", user.id);
        if (r.error) {
          error = r.error;
          break;
        }
      }
      break;
    }
  }
  if (error) return error.message;
  revalidatePath("/notizen");
  return null;
}

// Reihenfolge der Ordner auf einer Ebene speichern (Ziehen in der Seitenleiste)
export async function reorderNoteFolders(orderedIds: string[]): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const ids = orderedIds.filter((i) => /^[0-9a-f-]{36}$/i.test(i)).slice(0, 200);
  const results = await Promise.all(ids.map((id, position) => supabase.from("note_folders").update({ position }).eq("id", id).eq("user_id", user.id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return failed.error.message;
  revalidatePath("/notizen");
  return null;
}

// ---- Import ----

const IMPORT_MAX_FILES = 100;
const IMPORT_MAX_CHARS = 200_000;

// Markdown-Dateien als Notizen anlegen: Titel aus der ersten „# “-Überschrift (sonst Dateiname), #Tags aus dem Text (wie bei Bear-Exporten)
export async function importMarkdownNotes(files: { name: string; text: string }[], folderId: string | null = null): Promise<{ error: string } | { imported: number; skipped: number }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  const world = await getActiveWorld(user.id);
  const rows: Record<string, unknown>[] = [];
  let skipped = 0;
  for (const f of files.slice(0, IMPORT_MAX_FILES)) {
    const text = (f.text ?? "").replace(/^﻿/, "");
    if (!text.trim() || text.length > IMPORT_MAX_CHARS) {
      skipped++;
      continue;
    }
    let title = f.name.replace(/\.(md|markdown|txt)$/i, "").slice(0, 200);
    let md = text;
    const h = /^\s*#\s+(.+?)\s*\n/.exec(md);
    if (h) {
      title = h[1].slice(0, 200);
      md = md.slice(h[0].length);
    }
    rows.push({
      user_id: user.id,
      world_id: world?.id ?? null,
      folder_id: folderId,
      title,
      body: sanitizePostHtml(markdownToHtml(md)),
      tags: inlineTags(md),
    });
  }
  skipped += Math.max(0, files.length - IMPORT_MAX_FILES);
  if (rows.length === 0) return { imported: 0, skipped };
  const { error } = await supabase.from("notes").insert(rows);
  if (error) return { error: error.message };
  revalidatePath("/notizen");
  return { imported: rows.length, skipped };
}
