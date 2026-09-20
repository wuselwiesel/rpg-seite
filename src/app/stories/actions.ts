"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter } from "@/lib/active-character";
import { createNotification } from "@/lib/notifications";
import { sendMessage } from "@/app/chats/actions";
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

type StoryOwner = { id: string; character_id: string; characters: { owner_id: string; name: string } | null };

async function activeViewer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const world = await getActiveWorld(user.id);
  const character = world ? await getActiveCharacter(user.id, world.id) : null;
  return character ? { supabase, user, character } : null;
}

// Herz auf eine Story (an/aus) im Namen des aktiven Charakters.
export async function toggleStoryLike(storyId: string): Promise<{ liked: boolean } | { error: string }> {
  const viewer = await activeViewer();
  if (!viewer) return { error: "Du brauchst einen aktiven Charakter." };
  const { supabase, character } = viewer;

  const { data: existing } = await supabase
    .from("story_likes")
    .select("story_id")
    .eq("story_id", storyId)
    .eq("character_id", character.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("story_likes").delete().eq("story_id", storyId).eq("character_id", character.id);
    return error ? { error: error.message } : { liked: false };
  }

  const { error } = await supabase.from("story_likes").insert({ story_id: storyId, character_id: character.id });
  if (error) return { error: error.message };

  const { data: story } = await supabase
    .from("stories")
    .select("id, character_id, characters!stories_character_id_fkey(owner_id, name)")
    .eq("id", storyId)
    .maybeSingle<StoryOwner>();
  if (story?.characters && story.characters.owner_id !== viewer.user.id) {
    await createNotification(supabase, {
      userId: story.characters.owner_id,
      type: "story_like",
      actorName: character.name,
      actorAvatarUrl: character.avatar_url,
      link: `/characters/${story.character_id}`,
      message: "gefällt deine Story",
    });
  }
  return { liked: true };
}

// Antwort auf eine Story: landet als Nachricht (mit Story-Vorschau) im 1:1-Chat der beiden Charaktere.
export async function replyToStory(storyId: string, text: string): Promise<string | null> {
  const content = text.trim().slice(0, 1000);
  if (!content) return "Schreib eine Antwort.";
  const viewer = await activeViewer();
  if (!viewer) return "Du brauchst einen aktiven Charakter.";
  const { supabase, user, character } = viewer;

  const { data: story } = await supabase
    .from("stories")
    .select("id, character_id, characters!stories_character_id_fkey(owner_id, name)")
    .eq("id", storyId)
    .maybeSingle<StoryOwner>();
  if (!story?.characters) return "Story nicht gefunden.";
  if (story.character_id === character.id) return "Du kannst nicht auf deine eigene Story antworten.";

  // Bestehenden 1:1-Chat suchen …
  const { data: mine } = await supabase
    .from("chat_participants")
    .select("chat_id, chats!inner(is_group)")
    .eq("character_id", character.id)
    .eq("chats.is_group", false);
  const myChatIds = (mine ?? []).map((r) => r.chat_id as string);
  let chatId: string | null = null;
  if (myChatIds.length) {
    const { data: match } = await supabase
      .from("chat_participants")
      .select("chat_id")
      .eq("character_id", story.character_id)
      .in("chat_id", myChatIds)
      .limit(1);
    chatId = match?.[0]?.chat_id ?? null;
  }

  // … sonst neu anlegen.
  if (!chatId) {
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .insert({ is_group: false, created_by: user.id })
      .select("id")
      .single();
    if (chatError || !chat) return chatError?.message ?? "Chat konnte nicht erstellt werden.";
    const { error: partError } = await supabase.from("chat_participants").insert([
      { chat_id: chat.id, character_id: character.id },
      { chat_id: chat.id, character_id: story.character_id },
    ]);
    if (partError) return partError.message;
    chatId = chat.id;
  }

  return sendMessage(chatId!, character.id, content, null, { storyId });
}
