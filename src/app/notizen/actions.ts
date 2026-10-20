"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { sanitizePostHtml } from "@/lib/sanitize";
import { escapePostgrestValue } from "@/lib/postgrest";
import { LINK_COLUMN, isLinkKind, noteTitle, type LinkKind, type LinkTarget } from "@/lib/notes";
import { notesForTarget } from "@/lib/notes-data";

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
export async function createNote(input: { title?: string; text?: string; link?: { kind: LinkKind; id: string } } = {}): Promise<Result<{ id: string }>> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  const world = await getActiveWorld(user.id);
  const body = input.text?.trim() ? sanitizePostHtml(textToHtml(input.text.trim())) : "";
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: user.id, world_id: world?.id ?? null, title: (input.title ?? "").trim().slice(0, 200), body })
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

export async function saveNote(id: string, input: { title: string; body: string }): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const body = sanitizePostHtml(input.body);
  if (body.length > 100000) return "Die Notiz ist zu lang.";
  const { error } = await supabase
    .from("notes")
    .update({ title: input.title.trim().slice(0, 200), body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return error.message;
  revalidatePath("/notizen");
  return null;
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

export async function addNoteLink(noteId: string, kind: LinkKind, targetId: string): Promise<{ id: string } | { error: string }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  if (!isLinkKind(kind) || !/^[0-9a-f-]{36}$/i.test(targetId)) return { error: "Ungültiges Ziel." };
  const { data, error } = await supabase
    .from("note_links")
    .insert({ note_id: noteId, user_id: user.id, [LINK_COLUMN[kind]]: targetId })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    if (error?.code === "23505") {
      const { data: existing } = await supabase.from("note_links").select("id").eq("note_id", noteId).eq(LINK_COLUMN[kind], targetId).maybeSingle<{ id: string }>();
      if (existing) return { id: existing.id };
    }
    return { error: error?.code === "23503" ? "Das Ziel gibt es nicht mehr." : (error?.message ?? "Konnte nicht verknüpft werden.") };
  }
  revalidatePath(`/notizen/${noteId}`);
  revalidatePath("/notizen");
  return { id: data.id };
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
    return ((data ?? []) as unknown as { id: string; name: string; username: string | null; avatar_url: string | null; is_npc: boolean; worlds: { name: string } | { name: string }[] | null }[]).map((c) => ({
      kind,
      id: c.id,
      label: c.name,
      sub: [c.username ? `@${c.username}` : null, c.is_npc ? "NPC" : null, (Array.isArray(c.worlds) ? c.worlds[0] : c.worlds)?.name].filter(Boolean).join(" · "),
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
