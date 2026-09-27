"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMentionableCharacters, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld, getUserWorlds } from "@/lib/worlds";
import { rollFate } from "@/lib/fate-engine";
import { ALL_TAGS, FATES } from "@/lib/fate-data";
import { FATE_CATEGORIES, SEVERITY_ORDER } from "@/lib/fate-types";
import { sanitizePostHtml } from "@/lib/sanitize";
import { extractHashtags } from "@/lib/hashtags";
import { stripHtml } from "@/lib/strip-html";
import { notifyMentionedCharacterIds } from "@/lib/notifications";
import { parseMentionedCharacterIdsFromHtml } from "@/lib/mentions";
import type { Character, CharacterGender, CharacterSpecies } from "@/lib/types";
import type { Char1Config, CharacterMeta, FateCategory, SeverityRange, SlotConfig } from "@/lib/fate-types";

function toMeta(c: Character): CharacterMeta {
  return {
    id: c.id,
    name: c.name,
    gender: (c.gender ?? null) as CharacterGender | null,
    species: (c.species ?? "mensch") as CharacterSpecies,
    ownerId: c.owner_id,
    worldId: c.world_id,
    partnerId: c.partner_character_id ?? null,
    bestFriendId: c.best_friend_character_id ?? null,
  };
}

export type FatePreview = {
  fateId: number;
  category: string;
  severity: string;
  text: string;
  char1: { id: string; name: string };
  targets: { id: string; name: string }[];
};

export async function previewFateAction(
  char1Config: Char1Config,
  slots: SlotConfig[],
  severityRange: SeverityRange,
  categories: FateCategory[] = [],
): Promise<FatePreview | { error: string }> {
  if (slots.length > 2) return { error: "Maximal zwei zusätzliche Charaktere möglich." };
  if (!SEVERITY_ORDER.includes(severityRange.min) || !SEVERITY_ORDER.includes(severityRange.max)) {
    return { error: "Ungültiger Schweregrad." };
  }
  if (categories.some((c) => !FATE_CATEGORIES.includes(c))) {
    return { error: "Ungültige Kategorie." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) return { error: "Keine aktive Welt." };

  const myWorlds = await getUserWorlds(user.id);
  const myWorldIds = new Set(myWorlds.map((w) => w.id));
  for (const slot of slots) {
    if (!myWorldIds.has(slot.worldId)) return { error: "Ungültige Welt ausgewählt." };
  }

  const [ownCharacters, activeWorldMentionable, ...slotMentionable] = await Promise.all([
    getOwnCharacters(user.id, activeWorld.id),
    getMentionableCharacters(user.id, activeWorld.id),
    ...Array.from(new Set(slots.map((s) => s.worldId))).map((worldId) => getMentionableCharacters(user.id, worldId)),
  ]);
  if (ownCharacters.length === 0) return { error: "Du brauchst zuerst einen Charakter in dieser Welt." };

  // Charakter 1: im "pool"-Modus per Profil-Filter auch Freund:innen-Charaktere der aktiven Welt
  // möglich. Bei "Bestimmter Charakter" darf es auch ein fremder Charakter (anderer Account, auch
  // aus einer anderen Welt) sein - die Szene wird dann als Erzähler:in gepostet (postFateResultAction).
  let char1Pool: CharacterMeta[];
  if (char1Config.mode === "specific") {
    const own = ownCharacters.find((c) => c.id === char1Config.characterId);
    if (own) {
      char1Pool = [toMeta(own)];
    } else {
      const allMentionable = (await Promise.all(myWorlds.map((w) => getMentionableCharacters(user.id, w.id)))).flat();
      const found = allMentionable.find((c) => c.id === char1Config.characterId);
      if (!found) return { error: "Ungültiger Charakter." };
      char1Pool = [toMeta(found)];
    }
  } else {
    char1Pool = activeWorldMentionable.map(toMeta);
  }

  const targetPool = slotMentionable.flat().map(toMeta);
  const result = rollFate(char1Pool, targetPool, char1Config, slots, severityRange, categories);
  if ("error" in result) return result;

  return {
    fateId: result.fate.id,
    category: result.fate.category,
    severity: result.fate.severity,
    text: result.text,
    char1: { id: result.char1.id, name: result.char1.name },
    targets: result.targets.map((t) => ({ id: t.id, name: t.name })),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function mentionSpan(c: { id: string; name: string }): string {
  return `<span data-type="mention" class="mention" data-id="${c.id}">@${escapeHtml(c.name)}</span>`;
}

const MAX_THEME_TAGS = 5;
const MAX_THEME_TAG_LENGTH = 40;

export async function postFateResultAction(
  fateId: number,
  char1Id: string,
  targetIds: string[],
  themeTags: string[] = [],
): Promise<{ error: string } | { id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) return { error: "Keine aktive Welt." };

  const fate = FATES.find((f) => f.id === fateId);
  if (!fate) return { error: "Unbekanntes Schicksal." };

  const myWorlds = await getUserWorlds(user.id);
  const [ownCharacters, ...mentionablePerWorld] = await Promise.all([
    getOwnCharacters(user.id, activeWorld.id),
    ...myWorlds.map((w) => getMentionableCharacters(user.id, w.id)),
  ]);

  // Erreichbar über irgendeine Welt, in der die Person Mitglied ist (eigene + Freundes-Charaktere).
  const mentionableById = new Map<string, Character>();
  for (const list of mentionablePerWorld) for (const c of list) mentionableById.set(c.id, c);

  const char1Own = ownCharacters.find((c) => c.id === char1Id);
  const char1Subject = char1Own ?? mentionableById.get(char1Id);
  if (!char1Subject) return { error: "Ungültiger Charakter für Charakter 1." };

  // Charakter 1 ist kein eigener Charakter (anderer Account/andere Welt): die Szene braucht trotzdem
  // technisch eine eigene Autorin/einen eigenen Autor (Datenbank-Regel) - dann als Erzähler:in posten.
  let authorCharacter: Character;
  let narrator = false;
  if (char1Own) {
    authorCharacter = char1Own;
  } else {
    if (ownCharacters.length === 0) return { error: "Du brauchst einen eigenen Charakter in dieser Welt." };
    authorCharacter = ownCharacters[0];
    narrator = true;
  }

  if (targetIds.length < fate.minTargets || targetIds.length > fate.maxTargets) {
    return { error: "Ungültige Charakterauswahl." };
  }

  const targets: Character[] = [];
  const used = new Set([char1Id]);
  for (const id of targetIds) {
    const c = mentionableById.get(id);
    if (!c || used.has(id)) return { error: "Ungültige Charakterauswahl." };
    used.add(id);
    targets.push(c);
  }

  // Text serverseitig neu gerendert (nie dem Client vertrauen) – character1 fett (eigener Charakter,
  // schon als Autor:in sichtbar) oder als Erwähnung (fremder Charakter, Erzähler:in-Modus), die
  // übrigen Charaktere immer als klickbare @-Erwähnung.
  const template = targets.length === fate.maxTargets ? fate.text : (fate.soloText ?? fate.text);
  let html = template
    .split("{character1}")
    .join(narrator ? mentionSpan(char1Subject) : `<strong>${escapeHtml(char1Subject.name)}</strong>`);
  targets.forEach((target, i) => {
    html = html.split(`{character${i + 2}}`).join(mentionSpan(target));
  });
  html = `<p>${html}</p>`;

  // Gewürfelte Themen (aus dem unabhängigen Themen-Generator) mit in die Szene übernehmen –
  // nur bekannte Tags akzeptieren, nie ungeprüften Client-Text in den Beitrag schreiben.
  const validThemeTags = Array.from(new Set(themeTags))
    .filter((t) => ALL_TAGS.includes(t) && t.length <= MAX_THEME_TAG_LENGTH)
    .slice(0, MAX_THEME_TAGS);
  if (validThemeTags.length > 0) {
    html += `<p><em>Themen: ${validThemeTags.map(escapeHtml).join(", ")}</em></p>`;
  }
  const content = sanitizePostHtml(html);

  const title = `Schicksal: ${fate.category}`;
  const tags = extractHashtags(`${title} ${stripHtml(content)}`);

  const { data, error } = await supabase
    .from("story_posts")
    .insert({
      world_id: activeWorld.id,
      character_id: authorCharacter.id,
      title,
      content,
      tags,
      is_private: false,
      narrator,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Szene konnte nicht erstellt werden." };

  await notifyMentionedCharacterIds(
    parseMentionedCharacterIdsFromHtml(content),
    user.id,
    authorCharacter.id,
    `/story/${data.id}`,
    "wurde vom Schicksalswürfel in eine Szene verwickelt",
    narrator,
  );

  revalidatePath("/story");
  return { id: data.id };
}
