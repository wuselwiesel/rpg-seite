"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE } from "@/lib/types";
import { getActiveWorld } from "@/lib/worlds";
import { sanitizePostHtml } from "@/lib/sanitize";
import { stripHtml } from "@/lib/strip-html";
import { extractHashtags } from "@/lib/hashtags";
import { notifyMentionedCharacters, createNotification } from "@/lib/notifications";

async function getActiveCharacterInWorld(userId: string, worldId: string) {
  const cookieStore = await cookies();
  const cookieId = cookieStore.get(ACTIVE_CHARACTER_COOKIE)?.value;

  const supabase = await createClient();

  if (cookieId) {
    const { data } = await supabase
      .from("characters")
      .select("id")
      .eq("id", cookieId)
      .eq("owner_id", userId)
      .eq("world_id", worldId)
      .maybeSingle();
    if (data) return data.id;
  }

  const { data: fallback } = await supabase
    .from("characters")
    .select("id")
    .eq("owner_id", userId)
    .eq("world_id", worldId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return fallback?.id ?? null;
}

export async function createStoryPost(_prevState: string | null, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const rawContent = String(formData.get("content") ?? "").trim();
  const content = sanitizePostHtml(rawContent);

  const hasContent = stripHtml(content).length > 0 || content.includes("<img");
  if (!title || !hasContent) {
    return "Titel und Inhalt dürfen nicht leer sein.";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) return "Keine aktive Welt.";

  const characterId = await getActiveCharacterInWorld(user.id, activeWorld.id);
  if (!characterId) return "Du brauchst zuerst einen Charakter in dieser Welt.";

  const tags = extractHashtags(`${title} ${stripHtml(content)}`);

  const newArcName = String(formData.get("new_arc_name") ?? "").trim();
  const selectedArcId = String(formData.get("arc_id") ?? "").trim();
  let arcId: string | null = null;

  if (newArcName) {
    const { data: arc, error: arcError } = await supabase
      .from("story_arcs")
      .insert({ world_id: activeWorld.id, name: newArcName, created_by: user.id })
      .select("id")
      .single();
    if (arcError || !arc) return arcError?.message ?? "Handlungsstrang konnte nicht erstellt werden.";
    arcId = arc.id;
  } else if (selectedArcId) {
    arcId = selectedArcId;
  }

  const { data, error } = await supabase
    .from("story_posts")
    .insert({ world_id: activeWorld.id, character_id: characterId, arc_id: arcId, title, content, tags })
    .select("id")
    .single();

  if (error || !data) return error?.message ?? "Szene konnte nicht erstellt werden.";

  revalidatePath("/story");
  redirect(`/story/${data.id}`);
}

export async function createStoryEntry(
  storyPostId: string,
  worldId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return "Text darf nicht leer sein.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const characterId = await getActiveCharacterInWorld(user.id, worldId);
  if (!characterId) return "Du brauchst zuerst einen Charakter in dieser Welt.";

  const { error } = await supabase
    .from("story_entries")
    .insert({ story_post_id: storyPostId, character_id: characterId, content });

  if (error) return error.message;

  await notifyMentionedCharacters(
    content,
    user.id,
    characterId,
    `/story/${storyPostId}`,
    "hat dich in der Story erwähnt",
  );

  revalidatePath(`/story/${storyPostId}`);
  return null;
}

const ALLOWED_DICE = [4, 6, 8, 10, 12, 20, 100];

export async function createDiceRoll(
  storyPostId: string,
  worldId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const label = String(formData.get("label") ?? "").trim();
  const value = Number(formData.get("value"));
  const die = Number(formData.get("die"));
  const targetCharacterId = String(formData.get("target_character_id") ?? "").trim() || null;

  if (!label) return "Bitte angeben, worauf du würfelst.";
  if (!Number.isFinite(value) || value < 1 || value > 999) return "Ungültiger Wert.";
  if (!ALLOWED_DICE.includes(die)) return "Ungültiger Würfel.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const characterId = await getActiveCharacterInWorld(user.id, worldId);
  if (!characterId) return "Du brauchst zuerst einen Charakter in dieser Welt.";

  if (targetCharacterId) {
    const { data: target } = await supabase
      .from("characters")
      .select("world_id")
      .eq("id", targetCharacterId)
      .maybeSingle();
    if (!target || target.world_id !== worldId) return "Ungültiges Ziel.";
  }

  const result = 1 + Math.floor(Math.random() * die);
  const success = result <= value;

  const { error } = await supabase.from("story_entries").insert({
    story_post_id: storyPostId,
    character_id: characterId,
    content: `würfelt auf „${label}“: ${result}/${value} (W${die}) – ${success ? "Erfolg" : "Misserfolg"}`,
    roll_label: label,
    roll_value: value,
    roll_die: die,
    roll_result: result,
    roll_success: success,
    roll_target_character_id: targetCharacterId,
  });

  if (error) return error.message;

  if (targetCharacterId && targetCharacterId !== characterId) {
    const { data: target } = await supabase
      .from("characters")
      .select("owner_id")
      .eq("id", targetCharacterId)
      .maybeSingle();

    if (target?.owner_id) {
      const { data: actor } = await supabase
        .from("characters")
        .select("name, avatar_url")
        .eq("id", characterId)
        .maybeSingle();

      await createNotification(supabase, {
        userId: target.owner_id,
        type: "roll",
        actorName: actor?.name ?? "Jemand",
        actorAvatarUrl: actor?.avatar_url ?? null,
        link: `/story/${storyPostId}`,
        message: success
          ? `hat erfolgreich auf „${label}“ gegen dich gewürfelt`
          : `hat auf „${label}“ gegen dich gewürfelt – ohne Erfolg`,
      });
    }
  }

  revalidatePath(`/story/${storyPostId}`);
  return null;
}
