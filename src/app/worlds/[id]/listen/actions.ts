"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_CHOICE_LISTS, MAX_CHOICE_OPTIONS, splitOptionLabels } from "@/lib/choice-lists";
import { permissionError } from "@/lib/world-permissions";

const NOT_ALLOWED = "Das dürfen nur die Admins der Welt.";

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function done(worldId: string): null {
  revalidatePath(`/worlds/${worldId}/listen`);
  revalidatePath("/characters", "layout");
  return null;
}

function cleanLabel(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 40);
}

export async function createChoiceList(worldId: string, rawLabel: string, mode: "dropdown" | "text"): Promise<string | null> {
  const label = cleanLabel(rawLabel);
  if (!label) return "Bitte einen Namen für die Liste eingeben.";
  const { supabase, user } = await me();
  if (!user) return "Nicht angemeldet.";
  const { count } = await supabase.from("world_choice_lists").select("id", { count: "exact", head: true }).eq("world_id", worldId);
  if ((count ?? 0) >= MAX_CHOICE_LISTS) return `Eine Welt kann höchstens ${MAX_CHOICE_LISTS} Listen haben.`;
  const { error } = await supabase
    .from("world_choice_lists")
    .insert({ world_id: worldId, label, mode: mode === "text" ? "text" : "dropdown", sort_order: (count ?? 0) + 1 });
  if (error) return error.code === "23505" ? "Eine Liste mit diesem Namen gibt es schon." : permissionError(error);
  return done(worldId);
}

// disabled gilt nur für „Wesen“: Die Welt lässt das Feld ganz weg (keine Liste, keine feste Auswahl)
export async function updateChoiceList(worldId: string, listId: string, patch: { label?: string; mode?: "dropdown" | "text"; disabled?: boolean }): Promise<string | null> {
  const { supabase, user } = await me();
  if (!user) return "Nicht angemeldet.";
  const update: { label?: string; mode?: string; disabled?: boolean } = {};
  if (patch.label !== undefined) {
    const label = cleanLabel(patch.label);
    if (!label) return "Bitte einen Namen für die Liste eingeben.";
    update.label = label;
  }
  if (patch.mode) update.mode = patch.mode === "text" ? "text" : "dropdown";
  if (patch.disabled !== undefined) update.disabled = patch.disabled === true;
  let query = supabase.from("world_choice_lists").update(update).eq("id", listId).eq("world_id", worldId);
  if (patch.disabled !== undefined) query = query.eq("is_species", true);
  const { data, error } = await query.select("id");
  if (error) return error.code === "23505" ? "Eine Liste mit diesem Namen gibt es schon." : error.message;
  if (!data?.length) return NOT_ALLOWED;
  return done(worldId);
}

export async function deleteChoiceList(worldId: string, listId: string): Promise<string | null> {
  const { supabase, user } = await me();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.from("world_choice_lists").delete().eq("id", listId).eq("world_id", worldId).eq("is_species", false).select("id");
  if (error) return error.message;
  if (!data?.length) return NOT_ALLOWED;
  return done(worldId);
}

// Mehrere Einträge auf einmal (je Zeile oder durch Komma getrennt); schon vorhandene werden übersprungen.
export async function addChoiceOptions(worldId: string, listId: string, raw: string): Promise<string | null> {
  const labels = splitOptionLabels(raw);
  if (labels.length === 0) return "Bitte mindestens einen Eintrag eingeben.";
  const { supabase, user } = await me();
  if (!user) return "Nicht angemeldet.";
  const { data: list } = await supabase.from("world_choice_lists").select("id").eq("id", listId).eq("world_id", worldId).maybeSingle();
  if (!list) return NOT_ALLOWED;
  const { data: existing } = await supabase.from("world_choice_options").select("label, sort_order").eq("list_id", listId);
  const have = new Set((existing ?? []).map((o) => o.label.toLowerCase()));
  const fresh = labels.filter((l) => !have.has(l.toLowerCase()));
  if (fresh.length === 0) return null;
  if ((existing?.length ?? 0) + fresh.length > MAX_CHOICE_OPTIONS) return `Eine Liste kann höchstens ${MAX_CHOICE_OPTIONS} Einträge haben.`;
  const start = Math.max(0, ...(existing ?? []).map((o) => o.sort_order)) + 1;
  const { error } = await supabase.from("world_choice_options").insert(fresh.map((label, i) => ({ list_id: listId, label, sort_order: start + i })));
  if (error) return permissionError(error);
  return done(worldId);
}

// Höchstzahl eines Eintrags (null = unbegrenzt): so viele Charaktere der Welt dürfen ihn höchstens haben
export async function setChoiceOptionLimit(worldId: string, optionId: string, limit: number | null): Promise<string | null> {
  if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 999)) return "Bitte eine Zahl von 1 bis 999 eingeben (leer = unbegrenzt).";
  const { supabase, user } = await me();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.from("world_choice_options").update({ max_count: limit }).eq("id", optionId).select("id");
  if (error) return permissionError(error);
  if (!data?.length) return NOT_ALLOWED;
  return done(worldId);
}

export async function deleteChoiceOption(worldId: string, optionId: string): Promise<string | null> {
  const { supabase, user } = await me();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.from("world_choice_options").delete().eq("id", optionId).select("id");
  if (error) return error.message;
  if (!data?.length) return NOT_ALLOWED;
  return done(worldId);
}
