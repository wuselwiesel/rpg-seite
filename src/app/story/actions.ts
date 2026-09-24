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
import { notifyMentionedCharacterIds, createNotification } from "@/lib/notifications";
import { parseMentionedCharacterIdsFromHtml } from "@/lib/mentions";

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

// Der gewählte eigene Charakter (Feld "character_id"); ohne gültige Wahl der aktive Charakter.
async function resolveWriter(userId: string, worldId: string, chosenId: string) {
  if (chosenId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("characters")
      .select("id")
      .eq("id", chosenId)
      .eq("owner_id", userId)
      .eq("world_id", worldId)
      .maybeSingle();
    if (data) return data.id;
  }
  return getActiveCharacterInWorld(userId, worldId);
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

  const characterId = await resolveWriter(user.id, activeWorld.id, String(formData.get("character_id") ?? "").trim());
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

  const location = String(formData.get("location") ?? "").trim().slice(0, 80) || null;
  const inWorldTime = String(formData.get("in_world_time") ?? "").trim().slice(0, 80) || null;

  const isPrivate = formData.get("is_private") === "on";
  const viewerCharacterIds = formData.getAll("viewer_character_id").map(String).filter(Boolean);

  const { data, error } = await supabase
    .from("story_posts")
    .insert({
      world_id: activeWorld.id,
      character_id: characterId,
      arc_id: arcId,
      title,
      content,
      tags,
      is_private: isPrivate,
      location,
      in_world_time: inWorldTime,
      narrator: formData.get("narrator") === "on",
    })
    .select("id")
    .single();

  if (error || !data) return error?.message ?? "Szene konnte nicht erstellt werden.";

  if (isPrivate && viewerCharacterIds.length > 0) {
    await supabase
      .from("story_post_viewers")
      .insert(viewerCharacterIds.map((characterId) => ({ story_post_id: data.id, character_id: characterId })));
  }

  revalidatePath("/story");
  redirect(`/story/${data.id}`);
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Wer ist als Nächstes dran? Explizit gewählt oder automatisch: die Person, die zuletzt vor der
// Schreibenden geschrieben hat (Erzähler:in-Beiträge und Kapitel zählen nicht).
async function assignNextTurn(
  supabase: SupabaseClient,
  storyPostId: string,
  writerCharacterId: string,
  choice: string,
): Promise<string | null> {
  if (choice === "__none__") {
    await supabase.rpc("set_story_turn", { p_story_post_id: storyPostId, p_character_id: null });
    return null;
  }
  let nextId: string | null = null;
  if (choice && choice !== writerCharacterId) {
    nextId = choice;
  } else {
    const [{ data: post }, { data: entries }] = await Promise.all([
      supabase.from("story_posts").select("character_id, created_at, narrator").eq("id", storyPostId).maybeSingle(),
      supabase.from("story_entries").select("character_id, created_at, kind").eq("story_post_id", storyPostId),
    ]);
    const lastActive = new Map<string, number>();
    if (post && !post.narrator) lastActive.set(post.character_id, new Date(post.created_at).getTime());
    for (const e of entries ?? []) {
      if (e.kind === "narrator" || e.kind === "chapter") continue;
      const t = new Date(e.created_at).getTime();
      if (t > (lastActive.get(e.character_id) ?? 0)) lastActive.set(e.character_id, t);
    }
    lastActive.delete(writerCharacterId);
    let newest = -Infinity;
    for (const [id, t] of lastActive) {
      if (t > newest) {
        newest = t;
        nextId = id;
      }
    }
  }
  await supabase.rpc("set_story_turn", { p_story_post_id: storyPostId, p_character_id: nextId });
  return nextId;
}

// Benachrichtigt die Person, die als Nächstes dran ist ("<Schreibende> wartet auf dich").
async function notifyTurn(
  supabase: SupabaseClient,
  storyPostId: string,
  title: string,
  writerUserId: string,
  writerCharacterId: string,
  turnCharacterId: string,
  neutralActor = false,
) {
  const [{ data: target }, { data: writer }] = await Promise.all([
    supabase.from("characters").select("owner_id, name").eq("id", turnCharacterId).maybeSingle(),
    supabase.from("characters").select("name, avatar_url").eq("id", writerCharacterId).maybeSingle(),
  ]);
  if (!target || target.owner_id === writerUserId) return;
  await createNotification(supabase, {
    userId: target.owner_id,
    type: "turn",
    actorName: neutralActor ? "Erzähler:in" : (writer?.name ?? "Jemand"),
    actorAvatarUrl: neutralActor ? null : (writer?.avatar_url ?? null),
    link: `/story/${storyPostId}?as=${turnCharacterId}&ziel=ende`,
    message: `wartet in „${title}“ auf dich`,
    recipientName: target.name,
  });
}

export async function createStoryEntry(
  storyPostId: string,
  worldId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const rawContent = String(formData.get("content") ?? "").trim();
  const content = sanitizePostHtml(rawContent);
  if (!stripHtml(content)) return "Text darf nicht leer sein.";
  const narrator = formData.get("narrator") === "on";
  const nextChoice = String(formData.get("next_character_id") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const characterId = await resolveWriter(user.id, worldId, String(formData.get("character_id") ?? "").trim());
  if (!characterId) return "Du brauchst zuerst einen Charakter in dieser Welt.";

  const { error } = await supabase
    .from("story_entries")
    .insert({ story_post_id: storyPostId, character_id: characterId, content, kind: narrator ? "narrator" : "entry" });

  if (error) return error.message;

  await notifyMentionedCharacterIds(
    parseMentionedCharacterIdsFromHtml(content),
    user.id,
    characterId,
    `/story/${storyPostId}`,
    "hat dich in der Story erwähnt",
    narrator,
  );

  await afterWriting(supabase, storyPostId, user.id, characterId, nextChoice, true, narrator);

  revalidatePath(`/story/${storyPostId}`);
  revalidatePath("/story");
  return null;
}

// Nach jedem Beitrag (Fortsetzung, Wurf, Kapitel): Zug weitergeben und Bescheid sagen.
async function afterWriting(
  supabase: SupabaseClient,
  storyPostId: string,
  userId: string,
  characterId: string,
  nextChoice: string,
  notify = true,
  neutralActor = false,
) {
  const { data: before } = await supabase
    .from("story_posts")
    .select("title, turn_character_id")
    .eq("id", storyPostId)
    .maybeSingle();
  const next = await assignNextTurn(supabase, storyPostId, characterId, nextChoice);
  if (notify && next && next !== before?.turn_character_id && before) {
    await notifyTurn(supabase, storyPostId, before.title, userId, characterId, next, neutralActor);
  }
}

export async function createChapter(
  storyPostId: string,
  worldId: string,
  title: string,
  summary: string,
  chosenCharacterId = "",
): Promise<string | null> {
  const chapterTitle = title.trim().slice(0, 100);
  const chapterSummary = summary.trim().slice(0, 1500);
  if (!chapterTitle) return "Gib dem Kapitel einen Titel.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const characterId = await resolveWriter(user.id, worldId, chosenCharacterId);
  if (!characterId) return "Du brauchst zuerst einen Charakter in dieser Welt.";

  const { error } = await supabase.from("story_entries").insert({
    story_post_id: storyPostId,
    character_id: characterId,
    content: chapterTitle,
    kind: "chapter",
    chapter_title: chapterTitle,
    chapter_summary: chapterSummary || null,
  });
  if (error) return error.message;

  revalidatePath(`/story/${storyPostId}`);
  return null;
}

// Zug manuell setzen ("Als Nächstes: …") oder freigeben (null).
export async function setStoryTurn(storyPostId: string, characterId: string | null): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_story_turn", {
    p_story_post_id: storyPostId,
    p_character_id: characterId,
  });
  if (error) return error.message;
  revalidatePath(`/story/${storyPostId}`);
  revalidatePath("/story");
  return null;
}

// Push-Erinnerung an die Person, die dran ist (höchstens alle 30 Minuten pro Szene).
export async function sendTurnReminder(storyPostId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Nicht angemeldet." };

  const { data: post } = await supabase
    .from("story_posts")
    .select("title, world_id, turn_character_id")
    .eq("id", storyPostId)
    .maybeSingle();
  if (!post?.turn_character_id) return { ok: false, message: "Gerade ist niemand dran." };

  const { data: target } = await supabase
    .from("characters")
    .select("owner_id, name")
    .eq("id", post.turn_character_id)
    .maybeSingle();
  if (!target) return { ok: false, message: "Charakter nicht gefunden." };
  if (target.owner_id === user.id) return { ok: false, message: "Du bist selbst dran." };

  const { data: allowed } = await supabase.rpc("touch_turn_reminder", { p_story_post_id: storyPostId });
  if (!allowed) return { ok: false, message: "Du hast vor Kurzem schon erinnert. Warte ein bisschen." };

  const actor = await getActiveCharacterInWorld(user.id, post.world_id);
  const { data: writer } = actor
    ? await supabase.from("characters").select("name, avatar_url").eq("id", actor).maybeSingle()
    : { data: null };

  await createNotification(supabase, {
    userId: target.owner_id,
    type: "turn",
    actorName: writer?.name ?? "Jemand",
    actorAvatarUrl: writer?.avatar_url ?? null,
    link: `/story/${storyPostId}?as=${post.turn_character_id}&ziel=ende`,
    message: `wartet in „${post.title}“ auf dich`,
    recipientName: target.name,
  });
  return { ok: true, message: `Erinnerung an ${target.name} gesendet.` };
}

export async function updateStoryMeta(
  storyPostId: string,
  location: string,
  inWorldTime: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("story_posts")
    .update(
      { location: location.trim().slice(0, 80) || null, in_world_time: inWorldTime.trim().slice(0, 80) || null },
      { count: "exact" },
    )
    .eq("id", storyPostId);
  if (error) return error.message;
  if (!count) return "Nur die Autor:in der Szene kann Ort und Zeit ändern.";
  revalidatePath(`/story/${storyPostId}`);
  revalidatePath("/story");
  return null;
}

// Titel, Text und Erzähler-Modus der eigenen Szene ändern (RLS: nur Autor:in bzw. Welt-Besitzer:in).
export async function updateStoryPost(
  storyPostId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const title = String(formData.get("title") ?? "").trim();
  const content = sanitizePostHtml(String(formData.get("content") ?? "").trim());
  const hasContent = stripHtml(content).length > 0 || content.includes("<img");
  if (!title || !hasContent) return "Titel und Inhalt dürfen nicht leer sein.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase
    .from("story_posts")
    .update(
      {
        title,
        content,
        tags: extractHashtags(`${title} ${stripHtml(content)}`),
        narrator: formData.get("narrator") === "on",
      },
      { count: "exact" },
    )
    .eq("id", storyPostId);

  if (error) return error.message;
  if (!count) return "Nur die Autor:in kann die Szene bearbeiten.";

  revalidatePath(`/story/${storyPostId}`);
  revalidatePath("/story");
  return null;
}

export async function deleteStoryPost(storyPostId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase.from("story_posts").delete({ count: "exact" }).eq("id", storyPostId);
  if (error) return error.message;
  if (!count) return "Nur die Autor:in kann die Szene löschen.";

  revalidatePath("/story");
  redirect("/story");
}

export async function updateStoryEntry(
  entryId: string,
  storyPostId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const rawContent = String(formData.get("content") ?? "").trim();
  const content = sanitizePostHtml(rawContent);
  if (!stripHtml(content)) return "Text darf nicht leer sein.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error } = await supabase
    .from("story_entries")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", entryId);

  if (error) return error.message;

  revalidatePath(`/story/${storyPostId}`);
  return null;
}

export async function deleteStoryEntry(entryId: string, storyPostId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase
    .from("story_entries")
    .delete({ count: "exact" })
    .eq("id", entryId);

  if (error) return error.message;
  if (!count) return "Eintrag konnte nicht gelöscht werden.";

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
  const statName = String(formData.get("stat_name") ?? "").trim().slice(0, 60) || null;
  const rawValue = String(formData.get("value") ?? "").trim();
  // Ohne Wert wird nur der reine Würfelwurf angezeigt, ohne Erfolg/Misserfolg-Auswertung.
  const value = rawValue === "" ? null : Number(rawValue);
  const rawBonus = String(formData.get("bonus") ?? "").trim();
  const bonus = rawBonus === "" ? 0 : Number(rawBonus);
  const die = Number(formData.get("die"));
  const targetCharacterId = String(formData.get("target_character_id") ?? "").trim() || null;

  if (!label) return "Bitte angeben, worauf du würfelst.";
  if (value !== null && (!Number.isFinite(value) || value < 1 || value > 999)) return "Ungültiger Wert.";
  if (!Number.isFinite(bonus) || bonus < -99 || bonus > 99) return "Ungültiger Bonus.";
  if (!ALLOWED_DICE.includes(die)) return "Ungültiger Würfel.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const characterId = await resolveWriter(user.id, worldId, String(formData.get("character_id") ?? "").trim());
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
  // Bonus/Malus (Erschwernis/Erleichterung) wirkt auf den Zielwert, nicht auf den Wurf selbst -
  // positiver Bonus erleichtert die Probe (höherer Wert = leichter zu unterwürfeln).
  const effectiveValue = value === null ? null : Math.max(1, value + bonus);
  const success = effectiveValue === null ? null : result <= effectiveValue;

  const content =
    value === null
      ? `würfelt auf „${label}“: ${result} (W${die})`
      : `würfelt auf „${label}“: ${result}/${effectiveValue}${bonus !== 0 ? ` (${value}${bonus > 0 ? "+" : ""}${bonus})` : ""} (W${die}) – ${success ? "Erfolg" : "Misserfolg"}`;

  const { error } = await supabase.from("story_entries").insert({
    story_post_id: storyPostId,
    character_id: characterId,
    content,
    roll_label: label,
    roll_stat_name: statName,
    roll_value: value,
    roll_bonus: bonus !== 0 ? bonus : null,
    roll_die: die,
    roll_result: result,
    roll_success: success,
    roll_target_character_id: targetCharacterId,
  });

  if (error) return error.message;

  // Bei einem Wurf auf jemanden gibt es schon die Wurf-Benachrichtigung.
  await afterWriting(supabase, storyPostId, user.id, characterId, targetCharacterId ?? "", !targetCharacterId);

  if (targetCharacterId && targetCharacterId !== characterId) {
    const { data: target } = await supabase
      .from("characters")
      .select("owner_id, name")
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
        recipientName: target.name,
        message:
          success === null
            ? `hat auf „${label}“ gegen dich gewürfelt`
            : success
              ? `hat erfolgreich auf „${label}“ gegen dich gewürfelt`
              : `hat auf „${label}“ gegen dich gewürfelt – ohne Erfolg`,
      });
    }
  }

  revalidatePath(`/story/${storyPostId}`);
  return null;
}

// Moderationswerkzeuge für Welt-Owner: Szenen anpinnen/lösen, sperren/
// entsperren (keine neuen Fortsetzungen mehr) oder archivieren.
export async function toggleStoryPostFlag(
  storyPostId: string,
  flag: "pinned" | "locked" | "archived",
  value: boolean,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase
    .from("story_posts")
    .update({ [flag]: value }, { count: "exact" })
    .eq("id", storyPostId);

  if (error) return error.message;
  if (!count) return "Keine Berechtigung dafür.";

  revalidatePath(`/story/${storyPostId}`);
  revalidatePath("/story");
  return null;
}

export async function toggleStoryBookmark(storyPostId: string): Promise<{ error: string | null; bookmarked: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet.", bookmarked: false };

  const { data: existing } = await supabase
    .from("story_bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_post_id", storyPostId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("story_bookmarks").delete().eq("id", existing.id);
    if (error) return { error: error.message, bookmarked: true };
    revalidatePath("/story");
    return { error: null, bookmarked: false };
  }

  const { error } = await supabase
    .from("story_bookmarks")
    .insert({ user_id: user.id, story_post_id: storyPostId });
  if (error) return { error: error.message, bookmarked: false };

  revalidatePath("/story");
  return { error: null, bookmarked: true };
}
