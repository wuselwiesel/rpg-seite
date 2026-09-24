"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMentionableCharacters, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld, getUserWorlds } from "@/lib/worlds";
import { rollFate } from "@/lib/fate-engine";
import { FATES } from "@/lib/fate-data";
import { sanitizePostHtml } from "@/lib/sanitize";
import { extractHashtags } from "@/lib/hashtags";
import { stripHtml } from "@/lib/strip-html";
import { notifyMentionedCharacterIds } from "@/lib/notifications";
import { parseMentionedCharacterIdsFromHtml } from "@/lib/mentions";
import type { Character, CharacterGender, CharacterSpecies } from "@/lib/types";
import type { Char1Config, CharacterMeta, SlotConfig } from "@/lib/fate-types";

function toMeta(c: Character): CharacterMeta {
  return {
    id: c.id,
    name: c.name,
    gender: (c.gender ?? null) as CharacterGender | null,
    species: (c.species ?? "mensch") as CharacterSpecies,
    ownerId: c.owner_id,
    worldId: c.world_id,
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
): Promise<FatePreview | { error: string }> {
  if (slots.length > 2) return { error: "Maximal zwei zusätzliche Charaktere möglich." };

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

  const [ownCharacters, ...slotMentionable] = await Promise.all([
    getOwnCharacters(user.id, activeWorld.id),
    ...Array.from(new Set(slots.map((s) => s.worldId))).map((worldId) => getMentionableCharacters(user.id, worldId)),
  ]);
  if (ownCharacters.length === 0) return { error: "Du brauchst zuerst einen Charakter in dieser Welt." };

  if (char1Config.mode === "specific" && !ownCharacters.some((c) => c.id === char1Config.characterId)) {
    return { error: "Ungültiger Charakter." };
  }

  const targetPool = slotMentionable.flat().map(toMeta);
  const result = rollFate(ownCharacters.map(toMeta), targetPool, char1Config, slots);
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

export async function postFateResultAction(
  fateId: number,
  char1Id: string,
  targetIds: string[],
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

  const char1 = ownCharacters.find((c) => c.id === char1Id);
  if (!char1) return { error: "Ungültiger Charakter für Charakter 1." };
  if (targetIds.length < fate.minTargets || targetIds.length > fate.maxTargets) {
    return { error: "Ungültige Charakterauswahl." };
  }

  // Erreichbar über irgendeine Welt, in der die Person Mitglied ist (eigene + Freundes-Charaktere).
  const mentionableById = new Map<string, Character>();
  for (const list of mentionablePerWorld) for (const c of list) mentionableById.set(c.id, c);

  const targets: Character[] = [];
  const used = new Set([char1Id]);
  for (const id of targetIds) {
    const c = mentionableById.get(id);
    if (!c || used.has(id)) return { error: "Ungültige Charakterauswahl." };
    used.add(id);
    targets.push(c);
  }

  // Text serverseitig neu gerendert (nie dem Client vertrauen) – character1 fett statt als
  // Erwähnung (ist bereits die Autor:in der Szene), die übrigen Charaktere als klickbare @-Erwähnung.
  const template = targets.length === fate.maxTargets ? fate.text : (fate.soloText ?? fate.text);
  let html = template.split("{character1}").join(`<strong>${escapeHtml(char1.name)}</strong>`);
  targets.forEach((target, i) => {
    html = html.split(`{character${i + 2}}`).join(mentionSpan(target));
  });
  html = `<p>${html}</p>`;
  const content = sanitizePostHtml(html);

  const title = `Schicksal: ${fate.category}`;
  const tags = extractHashtags(`${title} ${stripHtml(content)}`);

  const { data, error } = await supabase
    .from("story_posts")
    .insert({
      world_id: activeWorld.id,
      character_id: char1.id,
      title,
      content,
      tags,
      is_private: false,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Szene konnte nicht erstellt werden." };

  await notifyMentionedCharacterIds(
    parseMentionedCharacterIdsFromHtml(content),
    user.id,
    char1.id,
    `/story/${data.id}`,
    "wurde vom Schicksalswürfel in eine Szene verwickelt",
    false,
  );

  revalidatePath("/story");
  return { id: data.id };
}
