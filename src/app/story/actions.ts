"use server";

import { syncCharacterBadges } from "@/lib/badges-server";
import { after } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE } from "@/lib/types";
import { getActiveWorld } from "@/lib/worlds";
import { sanitizePostHtml } from "@/lib/sanitize";
import { stripHtml } from "@/lib/strip-html";
import { isEmptyRecap, recapToHtml } from "@/lib/recap-html";
import { extractHashtags } from "@/lib/hashtags";
import { notifyMentionedCharacterIds, createNotification } from "@/lib/notifications";
import { parseMentionedCharacterIdsFromHtml } from "@/lib/mentions";
import { isRateLimited } from "@/lib/rate-limit";
import { resolveCondition } from "@/lib/dice-conditions";
import { columnsFromDates, parsePageDates } from "@/lib/wiki-calendar";
import { loadWikiCalendar } from "@/lib/wiki-calendar-data";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Zeitpunkt der Szene aus dem Formular, geprüft gegen den Kalender der Welt.
async function readSceneDates(formData: FormData, worldId: string) {
  const calendar = await loadWikiCalendar(worldId);
  const g = (k: string) => String(formData.get(k) ?? "");
  const dates = parsePageDates(calendar, {
    start: { year: g("date_year"), month: g("date_month"), day: g("date_day") },
    end: { year: g("date_end_year"), month: g("date_end_month"), day: g("date_end_day") },
  });
  return "error" in dates ? { error: dates.error, columns: null } : { error: null, columns: columnsFromDates(dates) };
}

// Zu jedem bei einer Szene angegebenen Ort gibt es automatisch einen leeren Wiki-Eintrag
// (Kategorie "ort"), den man dann füllen kann - legt nichts doppelt an, Titel-Vergleich
// ist case-insensitiv.
async function ensureLocationWikiPage(
  supabase: SupabaseClient,
  worldId: string,
  userId: string,
  location: string | null,
) {
  const title = location?.trim();
  if (!title) return;
  // Egal in welchem Ordner oder welcher Kategorie: gibt es eine Seite mit diesem Titel oder Alternativnamen, nichts anlegen.
  const { data: existing } = await supabase.from("wiki_pages").select("title, aliases").eq("world_id", worldId);
  const wanted = title.toLowerCase();
  if (
    (existing ?? []).some(
      (p) => p.title.toLowerCase() === wanted || ((p.aliases as string[] | null) ?? []).some((a) => a.toLowerCase() === wanted),
    )
  )
    return;
  // Neue Orte landen im Ordner "Orte", falls es ihn gibt.
  const { data: folders } = await supabase.from("wiki_folders").select("id, name").eq("world_id", worldId).is("parent_id", null);
  const orte = (folders ?? []).find((f) => f.name.trim().toLowerCase() === "orte");
  await supabase.from("wiki_pages").insert({
    world_id: worldId,
    category: "ort",
    folder_id: orte?.id ?? null,
    title,
    content: "",
    created_by: userId,
  });
}

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

  const sceneDates = await readSceneDates(formData, activeWorld.id);
  if (sceneDates.error !== null) return sceneDates.error;

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
      ...sceneDates.columns,
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

  if (location) await ensureLocationWikiPage(supabase, activeWorld.id, user.id, location);

  revalidatePath("/story");
  revalidatePath("/wiki");
  redirect(`/story/${data.id}`);
}

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

  if (await isRateLimited(supabase, "story_entries", "character_id", characterId, 10, 15)) {
    return "Zu viele Beiträge in kurzer Zeit. Kurz warten und nochmal versuchen.";
  }

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

  after(() => syncCharacterBadges(characterId));
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

// Zusammenfassung einer Szene schreiben, ändern oder (leer) entfernen.
export async function setSceneRecap(storyPostId: string, text: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  // Formatierter Text: bereinigt speichern; ohne Inhalt (nur leere Absätze) wird die Zusammenfassung entfernt.
  const html = sanitizePostHtml(recapToHtml(text));
  if (html.length > 30000) return "Die Zusammenfassung ist zu lang.";
  const { error } = await supabase.rpc("set_scene_recap", { p_story_post_id: storyPostId, p_text: isEmptyRecap(html) ? "" : html });
  if (error) return error.message;
  revalidatePath(`/story/${storyPostId}`);
  revalidatePath("/story");
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

// Nur das Datum im Kalender der Welt setzen oder entfernen. Das dürfen alle, die in der Welt mitspielen (RPC), nicht nur die Autor:in.
export async function setSceneDates(storyPostId: string, dateForm: FormData): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: post } = await supabase.from("story_posts").select("world_id").eq("id", storyPostId).maybeSingle();
  if (!post) return "Szene nicht gefunden.";
  const sceneDates = await readSceneDates(dateForm, post.world_id);
  if (sceneDates.error !== null) return sceneDates.error;

  const c = sceneDates.columns;
  const { error } = await supabase.rpc("set_scene_dates", {
    p_story_post_id: storyPostId,
    p_year: c.event_year,
    p_month: c.event_month,
    p_day: c.event_day,
    p_end_year: c.event_end_year,
    p_end_month: c.event_end_month,
    p_end_day: c.event_end_day,
  });
  if (error) return error.message === "Keine Berechtigung" ? "Nur wer in dieser Welt mitspielt, kann das Datum ändern." : error.message;

  revalidatePath("/story");
  revalidatePath(`/story/${storyPostId}`);
  revalidatePath("/wiki/zeitleiste");
  return null;
}

export async function updateStoryMeta(
  storyPostId: string,
  location: string,
  inWorldTime: string,
  dateForm: FormData,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: post } = await supabase.from("story_posts").select("world_id").eq("id", storyPostId).maybeSingle();
  if (!post) return "Nur die Autor:in der Szene kann Ort und Zeit ändern.";
  const sceneDates = await readSceneDates(dateForm, post.world_id);
  if (sceneDates.error !== null) return sceneDates.error;

  const trimmedLocation = location.trim().slice(0, 80) || null;
  const { data, error } = await supabase
    .from("story_posts")
    .update({ location: trimmedLocation, in_world_time: inWorldTime.trim().slice(0, 80) || null, ...sceneDates.columns })
    .eq("id", storyPostId)
    .select("world_id")
    .maybeSingle();
  if (error) return error.message;
  if (!data) return "Nur die Autor:in der Szene kann Ort und Zeit ändern.";

  if (trimmedLocation) await ensureLocationWikiPage(supabase, data.world_id, user.id, trimmedLocation);

  revalidatePath(`/story/${storyPostId}`);
  revalidatePath("/story");
  revalidatePath("/wiki");
  revalidatePath("/wiki/zeitleiste");
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
  revalidatePath("/story/wuerfe");
  return null;
}

const ALLOWED_DICE = [4, 6, 8, 10, 12, 20, 100];

// success: Ergebnis der Probe (null = freier Wurf ohne Wert); fehlt bei Fehlern
export type DiceRollState = { error: string | null; luckRemaining: number | null; success?: boolean | null };

type RollParams = {
  characterId: string;
  label: string;
  statName: string | null;
  value: number | null;
  bonus: number;
  die: number;
  targetCharacterId: string | null;
  // Bezeichnung eines Zustands wie „Betrunken (stark)“ (der Malus steckt schon im bonus), nur für die Anzeige
  condition?: string | null;
};

// Für die Anzeige im Würfeln-Formular, bevor überhaupt gewürfelt wurde.
export async function getLuckPointsRemaining(
  storyPostId: string,
  characterId: string,
  luckMax: number,
): Promise<number | null> {
  if (!Number.isFinite(luckMax) || luckMax < 0 || luckMax > 99) return null;
  const supabase = await createClient();
  return getLuckRemaining(supabase, storyPostId, characterId, luckMax);
}

// Letzter bekannter Glückspunkte-Stand dieses Charakters in dieser Szene (der jüngste Wurf mit
// gesetztem roll_luck_remaining) - ohne vorherigen Eintrag gilt der volle Wert aus dem Charakterbogen.
async function getLuckRemaining(
  supabase: SupabaseClient,
  storyPostId: string,
  characterId: string,
  luckMax: number,
): Promise<number> {
  const { data } = await supabase
    .from("story_entries")
    .select("roll_luck_remaining")
    .eq("story_post_id", storyPostId)
    .eq("character_id", characterId)
    .not("roll_luck_remaining", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Ältere Einträge können aus früherer Berechnung mehr Punkte enthalten als jetzt erlaubt.
  return Math.min(data?.roll_luck_remaining ?? luckMax, luckMax);
}

// Würfelt, legt den story_entries-Eintrag an und benachrichtigt ein etwaiges Ziel - genutzt sowohl
// vom normalen Wurf als auch vom Glücks-Reroll (identische Parameter, neuer Zufallswurf).
async function performDiceRoll(
  supabase: SupabaseClient,
  userId: string,
  storyPostId: string,
  params: RollParams,
  luckRemaining: number | null,
  spentLuck: boolean,
): Promise<DiceRollState> {
  const { characterId, label, statName, value, bonus, die, targetCharacterId } = params;
  const condition = params.condition?.trim().slice(0, 40) || null;

  if (await isRateLimited(supabase, "story_entries", "character_id", characterId, 10, 15)) {
    return { error: "Zu viele Würfe in kurzer Zeit. Kurz warten und nochmal versuchen.", luckRemaining: null };
  }

  const result = 1 + Math.floor(Math.random() * die);
  // Bonus/Malus (Erschwernis/Erleichterung) wirkt auf den Zielwert, nicht auf den Wurf selbst -
  // positiver Bonus erleichtert die Probe (höherer Wert = leichter zu unterwürfeln).
  const effectiveValue = value === null ? null : Math.max(1, value + bonus);
  const success = effectiveValue === null ? null : result <= effectiveValue;

  const verb = spentLuck ? "setzt einen Glückspunkt ein und würfelt erneut auf" : "würfelt auf";
  const what = `„${label}“${condition ? ` (${condition})` : ""}`;
  const content =
    value === null
      ? `${verb} ${what}: ${result} (W${die})`
      : `${verb} ${what}: ${result}/${effectiveValue}${bonus !== 0 ? ` (${value}${bonus > 0 ? "+" : ""}${bonus})` : ""} (W${die}) – ${success ? "Erfolg" : "Misserfolg"}`;

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
    roll_luck_remaining: luckRemaining,
    roll_condition: condition,
  });

  if (error) return { error: error.message, luckRemaining: null };

  // Bei einem Wurf auf jemanden gibt es schon die Wurf-Benachrichtigung.
  await afterWriting(supabase, storyPostId, userId, characterId, targetCharacterId ?? "", !targetCharacterId);

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
  return { error: null, luckRemaining, success };
}

export async function createDiceRoll(
  storyPostId: string,
  worldId: string,
  _prevState: DiceRollState | null,
  formData: FormData,
): Promise<DiceRollState> {
  const label = String(formData.get("label") ?? "").trim();
  const statName = String(formData.get("stat_name") ?? "").trim().slice(0, 60) || null;
  const rawValue = String(formData.get("value") ?? "").trim();
  // Ohne Wert wird nur der reine Würfelwurf angezeigt, ohne Erfolg/Misserfolg-Auswertung.
  const value = rawValue === "" ? null : Number(rawValue);
  const rawBonus = String(formData.get("bonus") ?? "").trim();
  // Zustand (z. B. Betrunken, stark): sein Malus wird hier auf den Bonus gerechnet, damit niemand ihn weglassen oder ändern kann
  const condition = resolveCondition(String(formData.get("condition") ?? ""));
  const bonus = (rawBonus === "" ? 0 : Number(rawBonus)) + (condition?.malus ?? 0);
  const die = Number(formData.get("die"));
  const targetCharacterId = String(formData.get("target_character_id") ?? "").trim() || null;
  const rawLuckMax = String(formData.get("luck_max") ?? "").trim();
  const luckMax = rawLuckMax === "" ? null : Number(rawLuckMax);

  if (!label) return { error: "Bitte angeben, worauf du würfelst.", luckRemaining: null };
  if (value !== null && (!Number.isFinite(value) || value < 1 || value > 999))
    return { error: "Ungültiger Wert.", luckRemaining: null };
  if (!Number.isFinite(bonus) || bonus < -99 || bonus > 99) return { error: "Ungültiger Bonus.", luckRemaining: null };
  if (!ALLOWED_DICE.includes(die)) return { error: "Ungültiger Würfel.", luckRemaining: null };
  if (luckMax !== null && (!Number.isFinite(luckMax) || luckMax < 0 || luckMax > 99))
    return { error: "Ungültiger Glückswert.", luckRemaining: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet.", luckRemaining: null };

  const characterId = await resolveWriter(user.id, worldId, String(formData.get("character_id") ?? "").trim());
  if (!characterId) return { error: "Du brauchst zuerst einen Charakter in dieser Welt.", luckRemaining: null };

  if (targetCharacterId) {
    const { data: target } = await supabase
      .from("characters")
      .select("world_id")
      .eq("id", targetCharacterId)
      .maybeSingle();
    if (!target || target.world_id !== worldId) return { error: "Ungültiges Ziel.", luckRemaining: null };
  }

  const luckRemaining = luckMax === null ? null : await getLuckRemaining(supabase, storyPostId, characterId, luckMax);

  return performDiceRoll(
    supabase,
    user.id,
    storyPostId,
    { characterId, label, statName, value, bonus, die, targetCharacterId, condition: condition?.text ?? null },
    luckRemaining,
    false,
  );
}

// Glückspunkt einsetzen: derselbe Wurf (gleicher Wert/Bonus/Würfel/Ziel) wird noch einmal gewürfelt,
// nur solange in dieser Szene für diesen Charakter noch Glückspunkte übrig sind.
export async function rerollWithLuck(
  storyPostId: string,
  worldId: string,
  params: RollParams & { luckMax: number },
): Promise<DiceRollState> {
  const { luckMax, ...rollParams } = params;
  if (!Number.isFinite(luckMax) || luckMax < 1 || luckMax > 99) return { error: "Ungültiger Glückswert.", luckRemaining: null };
  if (!ALLOWED_DICE.includes(rollParams.die)) return { error: "Ungültiger Würfel.", luckRemaining: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet.", luckRemaining: null };

  const characterId = await resolveWriter(user.id, worldId, rollParams.characterId);
  if (!characterId) return { error: "Du brauchst zuerst einen Charakter in dieser Welt.", luckRemaining: null };

  const current = await getLuckRemaining(supabase, storyPostId, characterId, luckMax);
  if (current <= 0) return { error: "Keine Glückspunkte mehr übrig.", luckRemaining: 0 };

  return performDiceRoll(supabase, user.id, storyPostId, { ...rollParams, characterId }, current - 1, true);
}

// Anpinnen/Archivieren: Moderationswerkzeuge für Welt-Owner. Sperren/Entsperren ("Abschließen"/
// "Fortsetzen") darf zusätzlich die Autor:in der Szene selbst (RLS erlaubt das bereits für alle
// drei Flags, siehe story_posts_update_author) - die Sichtbarkeit der Buttons steuert die UI.
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

  // Beim Abschließen/Fortsetzen immer den Zug löschen: Abgeschlossen heißt niemand ist mehr
  // dran (die Story-Übersicht berechnet "Du bist dran" rein aus turn_character_id, unabhängig
  // von locked); beim Fortsetzen verhindert es, dass ein veralteter Zug sofort wieder aufblitzt.
  const update: Record<string, unknown> = { [flag]: value };
  if (flag === "locked") {
    update.turn_character_id = null;
    update.turn_set_at = null;
  }

  const { error, count } = await supabase
    .from("story_posts")
    .update(update, { count: "exact" })
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
