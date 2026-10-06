import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizePostHtml } from "@/lib/sanitize";
import { escapeHtml } from "@/lib/character-links";
import { quoteFromItems, type ChatQuote, type Clip, type ClipItem } from "@/lib/clips";
import type { QuoteSource } from "@/lib/scene-quote";

import { MAX_CLIP_ENTRIES_CLIENT } from "@/lib/clip-limits";

export const MAX_CLIP_ENTRIES = MAX_CLIP_ENTRIES_CLIENT;

type EntryRow = {
  id: string;
  content: string;
  kind: string | null;
  roll_label: string | null;
  created_at: string;
  characters: { name: string } | null;
};

// Wortlaut der gewählten Nachrichten einer Szene (so, wie die Person sie lesen darf), älteste zuerst, als bereinigte Kopie
export async function loadEntryItems(supabase: SupabaseClient, storyPostId: string, entryIds: string[]): Promise<ClipItem[]> {
  const { data } = await supabase
    .from("story_entries")
    .select("id, content, kind, roll_label, created_at, characters!story_entries_character_id_fkey(name)")
    .eq("story_post_id", storyPostId)
    .in("id", entryIds.slice(0, MAX_CLIP_ENTRIES))
    .or("kind.is.null,kind.neq.chapter")
    .order("created_at", { ascending: true })
    .returns<EntryRow[]>();
  return (data ?? []).map((e) => ({
    id: e.id,
    author: e.kind === "narrator" ? "Erzähler:in" : (e.characters?.name ?? "Unbekannt"),
    html: sanitizePostHtml(e.content?.trim() ? e.content : `<p>${escapeHtml(e.roll_label ?? "Wurf")}</p>`),
    at: e.created_at,
  }));
}

// Zitat für den Szenen-Chat aus der Quelle bauen
export async function buildQuote(supabase: SupabaseClient, source: QuoteSource): Promise<ChatQuote | { error: string }> {
  if ("clipId" in source) {
    const { data: clip } = await supabase
      .from("scene_clips")
      .select("id, title, story_post_id, items")
      .eq("id", source.clipId)
      .maybeSingle<{ id: string; title: string; story_post_id: string | null; items: ClipItem[] }>();
    if (!clip) return { error: "Ausschnitt nicht gefunden." };
    return quoteFromItems(clip.story_post_id, clip.items, { clipId: clip.id, title: clip.title });
  }
  if (!source.entryIds.length) return { error: "Keine Nachrichten gewählt." };
  const items = await loadEntryItems(supabase, source.storyPostId, source.entryIds);
  if (!items.length) return { error: "Die gewählten Nachrichten wurden nicht gefunden." };
  return quoteFromItems(source.storyPostId, items);
}

// Eine Sammlung samt Ausschnitten (nur die eigene: die Zugriffsregeln der Datenbank lassen nichts anderes zu)
export async function loadCollection(supabase: SupabaseClient, collectionId: string): Promise<{ name: string; characterName: string; clips: Clip[] } | null> {
  const { data } = await supabase
    .from("clip_collections")
    .select("name, characters(name), clip_collection_items(position, scene_clips(id, title, note, scene_title, story_post_id, items, created_at))")
    .eq("id", collectionId)
    .maybeSingle<{ name: string; characters: { name: string } | null; clip_collection_items: { position: number; scene_clips: Clip | null }[] }>();
  if (!data) return null;
  return {
    name: data.name,
    characterName: data.characters?.name ?? "",
    clips: [...data.clip_collection_items]
      .sort((a, b) => a.position - b.position)
      .map((i) => i.scene_clips)
      .filter((c): c is Clip => !!c),
  };
}
