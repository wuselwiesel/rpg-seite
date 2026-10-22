"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { sanitizePostHtml } from "@/lib/sanitize";
import { escapeHtml } from "@/lib/character-links";

export type WikiTarget = { id: string; title: string; pageType: string | null; isCharacter: boolean };

// Wiki-Seiten der aktiven Welt als Ziele für „Ins Wiki“ aus einer Szene
export async function listWikiTargets(): Promise<WikiTarget[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const world = await getActiveWorld(user.id);
  if (!world) return [];
  const { data } = await supabase
    .from("wiki_pages")
    .select("id, title, page_type, character_id")
    .eq("world_id", world.id)
    .order("title")
    .limit(800)
    .returns<{ id: string; title: string; page_type: string | null; character_id: string | null }[]>();
  return (data ?? []).map((p) => ({ id: p.id, title: p.title, pageType: p.page_type, isCharacter: !!p.character_id }));
}

const HEADING = "<h2>Aus Szenen</h2>";

// Eine Notiz aus einer Szene an eine Wiki-Seite hängen (unter der Überschrift „Aus Szenen“ am Ende), mit Link zur Stelle in der Szene.
export async function appendSceneNote(pageId: string, note: string, sceneId: string, entryId: string | null): Promise<{ error: string } | { ok: true }> {
  const text = note.replace(/\s+/g, " ").trim().slice(0, 1000);
  if (!text) return { error: "Bitte eine Notiz schreiben." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { data: scene } = await supabase.from("story_posts").select("id, title, world_id").eq("id", sceneId).maybeSingle<{ id: string; title: string; world_id: string }>();
  if (!scene) return { error: "Die Szene wurde nicht gefunden." };
  const { data: page } = await supabase.from("wiki_pages").select("id, world_id, content").eq("id", pageId).maybeSingle<{ id: string; world_id: string; content: string }>();
  if (!page || page.world_id !== scene.world_id) return { error: "Die Seite wurde nicht gefunden." };

  const safeEntry = entryId && /^[0-9a-f-]{36}$/i.test(entryId) ? `#beitrag-${entryId}` : "";
  const line = `<p>${escapeHtml(text)} <a href="/story/${scene.id}${safeEntry}">Szene: ${escapeHtml(scene.title)}</a></p>`;
  const base = page.content ?? "";
  const next = sanitizePostHtml(base.includes(HEADING) ? `${base}${line}` : `${base}${HEADING}${line}`);

  const { data: updated, error } = await supabase.from("wiki_pages").update({ content: next, updated_at: new Date().toISOString() }).eq("id", pageId).select("id");
  if (error) return { error: error.message };
  if (!updated?.length) return { error: "Du darfst diese Seite nicht bearbeiten." };

  revalidatePath(`/wiki/${pageId}`);
  return { ok: true };
}
