"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendAccountMessage } from "@/app/redaktion/chat/actions";
import { MAX_CLIP_ENTRIES, buildQuote, loadEntryItems } from "@/lib/clip-server";
import type { QuoteDraft, QuoteSource } from "@/lib/scene-quote";

// Ausschnitt aus den gewählten Nachrichten einer Szene speichern und in eine Sammlung pro Charakter legen.
export async function saveSceneClip(input: {
  storyPostId: string;
  entryIds: string[];
  title: string;
  note: string;
  characterIds: string[];
  collectionName: string;
}): Promise<{ error: string } | { ok: true; clipId: string }> {
  const title = input.title.trim().slice(0, 120);
  const note = input.note.trim().slice(0, 1000);
  const collectionName = input.collectionName.trim().slice(0, 60);
  if (!title) return { error: "Bitte einen Titel angeben." };
  if (!collectionName) return { error: "Bitte eine Sammlung angeben." };
  if (input.characterIds.length === 0) return { error: "Bitte mindestens einen Charakter wählen." };
  if (input.entryIds.length === 0) return { error: "Keine Nachrichten gewählt." };
  if (input.entryIds.length > MAX_CLIP_ENTRIES) return { error: `Ein Ausschnitt kann höchstens ${MAX_CLIP_ENTRIES} Nachrichten enthalten.` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const [items, { data: scene }, { data: owned }] = await Promise.all([
    loadEntryItems(supabase, input.storyPostId, input.entryIds),
    supabase.from("story_posts").select("title").eq("id", input.storyPostId).maybeSingle<{ title: string }>(),
    supabase.from("characters").select("id").eq("owner_id", user.id).in("id", input.characterIds).is("deleted_at", null),
  ]);
  if (!scene) return { error: "Szene nicht gefunden." };
  if (!items.length) return { error: "Die gewählten Nachrichten wurden nicht gefunden." };
  const characterIds = (owned ?? []).map((c) => c.id);
  if (characterIds.length === 0) return { error: "Bitte nur eigene Charaktere wählen." };

  const { data: clip, error } = await supabase
    .from("scene_clips")
    .insert({ owner_id: user.id, story_post_id: input.storyPostId, scene_title: scene.title, title, note: note || null, items })
    .select("id")
    .single<{ id: string }>();
  if (error || !clip) return { error: error?.message ?? "Ausschnitt konnte nicht gespeichert werden." };

  for (const characterId of characterIds) {
    const collectionId = await ensureCollection(supabase, characterId, collectionName);
    if (!collectionId) continue;
    const { count } = await supabase.from("clip_collection_items").select("clip_id", { count: "exact", head: true }).eq("collection_id", collectionId);
    await supabase.from("clip_collection_items").insert({ collection_id: collectionId, clip_id: clip.id, position: count ?? 0 });
  }

  for (const id of characterIds) revalidatePath(`/characters/${id}`);
  return { ok: true, clipId: clip.id };
}

async function ensureCollection(supabase: Awaited<ReturnType<typeof createClient>>, characterId: string, name: string): Promise<string | null> {
  const { data: existing } = await supabase.from("clip_collections").select("id, name").eq("character_id", characterId).ilike("name", name.replace(/[\\%_]/g, (m) => `\\${m}`));
  const found = existing?.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  const { count } = await supabase.from("clip_collections").select("id", { count: "exact", head: true }).eq("character_id", characterId);
  const { data: created } = await supabase.from("clip_collections").insert({ character_id: characterId, name, position: count ?? 0 }).select("id").single<{ id: string }>();
  return created?.id ?? null;
}

export async function createClipCollection(characterId: string, name: string): Promise<string | null> {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return "Bitte einen Namen angeben.";
  const supabase = await createClient();
  const id = await ensureCollection(supabase, characterId, trimmed);
  if (!id) return "Sammlung konnte nicht angelegt werden.";
  revalidatePath(`/characters/${characterId}`);
  return null;
}

export async function renameClipCollection(collectionId: string, name: string): Promise<string | null> {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return "Bitte einen Namen angeben.";
  const supabase = await createClient();
  const { error, count } = await supabase.from("clip_collections").update({ name: trimmed }, { count: "exact" }).eq("id", collectionId);
  if (error) return error.code === "23505" ? "So eine Sammlung gibt es schon." : error.message;
  return count ? null : "Keine Berechtigung.";
}

export async function deleteClipCollection(collectionId: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.from("clip_collections").delete().eq("id", collectionId);
  return error ? error.message : null;
}

export async function removeClipFromCollection(collectionId: string, clipId: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.from("clip_collection_items").delete().eq("collection_id", collectionId).eq("clip_id", clipId);
  return error ? error.message : null;
}

// Ausschnitt ganz löschen (aus allen Sammlungen)
export async function deleteClip(clipId: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.from("scene_clips").delete().eq("id", clipId);
  return error ? error.message : null;
}

export async function updateClip(clipId: string, title: string, note: string): Promise<string | null> {
  const t = title.trim().slice(0, 120);
  if (!t) return "Bitte einen Titel angeben.";
  const supabase = await createClient();
  const { error, count } = await supabase.from("scene_clips").update({ title: t, note: note.trim().slice(0, 1000) || null }, { count: "exact" }).eq("id", clipId);
  if (error) return error.message;
  return count ? null : "Keine Berechtigung.";
}

// Vorschau eines Zitats für den Szenen-Chat (Nachrichten oder Ausschnitt)
export async function previewSceneQuote(source: QuoteSource): Promise<QuoteDraft | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const quote = await buildQuote(supabase, source);
  if ("error" in quote) return quote;
  return { source, quote };
}

// Gespeicherten Ausschnitt als Zitat in den Chat seiner Szene schicken
export async function shareClipToSceneChat(clipId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: clip } = await supabase.from("scene_clips").select("story_post_id").eq("id", clipId).maybeSingle<{ story_post_id: string | null }>();
  if (!clip) return "Ausschnitt nicht gefunden.";
  if (!clip.story_post_id) return "Die Szene gibt es nicht mehr.";
  const { data: chatId, error } = await supabase.rpc("open_scene_chat", { p_story_post_id: clip.story_post_id });
  if (error || !chatId) return error?.message === "Keine Berechtigung" ? "Der Chat ist nur für Mitspielende dieser Szene." : (error?.message ?? "Der Chat konnte nicht geöffnet werden.");
  return sendAccountMessage(chatId as string, "", undefined, null, null, { clipId });
}
