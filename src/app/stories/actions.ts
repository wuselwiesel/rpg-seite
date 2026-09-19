"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter } from "@/lib/active-character";
import { STORY_DURATIONS, isValidStoryBg, parseOverlays } from "@/lib/stories";

export async function createStory(_prev: string | null, formData: FormData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const ownStorage = (url: string) => (url.startsWith(`${supabaseUrl}/storage/`) ? url : "");
  const imageUrl = ownStorage(String(formData.get("image_url") ?? "").trim());
  const videoUrl = ownStorage(String(formData.get("video_url") ?? "").trim());
  const overlays = parseOverlays(String(formData.get("overlays") ?? "[]"));
  const text = overlays.map((o) => o.t.trim()).join("\n");
  const bg = String(formData.get("bg") ?? "");
  const rawAudioUrl = String(formData.get("audio_url") ?? "").trim();
  const audioUrl = rawAudioUrl.startsWith("https://") ? rawAudioUrl : "";
  const audioName = String(formData.get("audio_name") ?? "").trim();
  const hours = Number(formData.get("hours"));

  if (!imageUrl && !videoUrl && !text) return "Füge ein Bild oder einen Text hinzu.";
  const duration = STORY_DURATIONS.find((d) => d.hours === hours)?.hours ?? 24;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const world = await getActiveWorld(user.id);
  const character = world ? await getActiveCharacter(user.id, world.id) : null;
  if (!character) return "Du brauchst zuerst einen Charakter.";

  const { error } = await supabase.from("stories").insert({
    character_id: character.id,
    image_url: imageUrl || null,
    video_url: videoUrl || null,
    text_content: text || null,
    overlays: overlays.length ? overlays : null,
    bg: isValidStoryBg(bg) ? bg : null,
    audio_url: audioUrl && !videoUrl ? audioUrl : null,
    audio_name: audioUrl && !videoUrl ? audioName.slice(0, 80) : null,
    expires_at: new Date(Date.now() + duration * 3600_000).toISOString(),
  });
  if (error) return error.message;

  revalidatePath("/", "layout");
  redirect("/");
}

export async function deleteStory(storyId: string): Promise<string | null> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("stories").delete({ count: "exact" }).eq("id", storyId);
  if (error) return error.message;
  if (!count) return "Story konnte nicht gelöscht werden.";
  revalidatePath("/", "layout");
  return null;
}

export async function createHighlight(characterId: string, _prev: string | null, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 30);
  const storyIds = formData.getAll("story_ids").map(String);
  if (!title) return "Gib dem Highlight einen Namen.";
  if (storyIds.length === 0) return "Wähle mindestens eine Story aus.";

  const supabase = await createClient();
  const { data: highlight, error } = await supabase
    .from("highlights")
    .insert({ character_id: characterId, title })
    .select("id")
    .single();
  if (error || !highlight) return error?.message ?? "Highlight konnte nicht erstellt werden.";

  const { error: linkError } = await supabase
    .from("highlight_stories")
    .insert(storyIds.map((story_id, position) => ({ highlight_id: highlight.id, story_id, position })));
  if (linkError) {
    await supabase.from("highlights").delete().eq("id", highlight.id);
    return linkError.message;
  }

  revalidatePath(`/characters/${characterId}`);
  redirect(`/characters/${characterId}`);
}

export async function deleteHighlight(highlightId: string, characterId: string): Promise<string | null> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("highlights").delete({ count: "exact" }).eq("id", highlightId);
  if (error) return error.message;
  if (!count) return "Highlight konnte nicht gelöscht werden.";
  revalidatePath(`/characters/${characterId}`);
  return null;
}
