"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { cleanMapTitle, cleanPinInput, clamp, type PinInput, type WikiMapPin } from "@/lib/wiki-map";

type Result<T = object> = { ok: false; error: string } | ({ ok: true } & T);

const PIN_COLUMNS = "id, map_id, x, y, label, icon, page_id, target_map_id";

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function done() {
  revalidatePath("/wiki", "layout");
}

const pct = (v: number) => clamp(Math.round(Number(v) * 1000) / 1000, 0, 100);

export async function createWikiMap(input: { title: string; description?: string; imageUrl: string }): Promise<Result<{ id: string }>> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const world = await getActiveWorld(user.id);
  if (!world) return { ok: false, error: "Keine aktive Welt." };
  const title = cleanMapTitle(input.title);
  if (!title) return { ok: false, error: "Bitte gib der Karte einen Namen." };
  const imageUrl = String(input.imageUrl ?? "").trim();
  if (!/^https:\/\//.test(imageUrl) || imageUrl.length > 500) return { ok: false, error: "Bitte lade ein Kartenbild hoch." };
  const description = (input.description ?? "").replace(/\s+/g, " ").trim().slice(0, 500) || null;
  const { data, error } = await supabase
    .from("wiki_maps")
    .insert({ world_id: world.id, title, description, image_url: imageUrl, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Karte konnte nicht angelegt werden." };
  done();
  return { ok: true, id: data.id as string };
}

// imageUrl: optional neues Kartenbild; die Pins behalten ihre Position (in Prozent).
export async function updateWikiMap(id: string, input: { title: string; description?: string; imageUrl?: string }): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const title = cleanMapTitle(input.title);
  if (!title) return { ok: false, error: "Bitte gib der Karte einen Namen." };
  const description = (input.description ?? "").replace(/\s+/g, " ").trim().slice(0, 500) || null;
  const imageUrl = input.imageUrl === undefined ? undefined : String(input.imageUrl).trim();
  if (imageUrl !== undefined && (!/^https:\/\//.test(imageUrl) || imageUrl.length > 500)) return { ok: false, error: "Das Kartenbild ist ungültig." };
  const { data, error } = await supabase
    .from("wiki_maps")
    .update({ title, description, ...(imageUrl ? { image_url: imageUrl } : {}), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Karte nicht gefunden oder keine Berechtigung." };
  done();
  return { ok: true };
}

// Löschen dürfen nur, wer die Karte angelegt hat, und die Besitzerin der Welt (Datenbank-Regel); Pins gehen mit.
export async function deleteWikiMap(id: string): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const { error, count } = await supabase.from("wiki_maps").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "Karte konnte nicht gelöscht werden (keine Berechtigung)." };
  done();
  return { ok: true };
}

export async function addMapPin(mapId: string, x: number, y: number, raw: Parameters<typeof cleanPinInput>[0]): Promise<Result<{ pin: WikiMapPin }>> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const input = cleanPinInput(raw);
  if ("error" in input) return { ok: false, error: input.error };
  const { data, error } = await supabase
    .from("wiki_map_pins")
    .insert({ map_id: mapId, x: pct(x), y: pct(y), label: input.label, icon: input.icon, page_id: input.pageId, target_map_id: input.targetMapId, created_by: user.id })
    .select(PIN_COLUMNS)
    .single<WikiMapPin>();
  if (error || !data) return { ok: false, error: error?.message ?? "Pin konnte nicht gesetzt werden." };
  done();
  return { ok: true, pin: { ...data, x: Number(data.x), y: Number(data.y) } };
}

export async function movePin(pinId: string, x: number, y: number): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const { data, error } = await supabase.from("wiki_map_pins").update({ x: pct(x), y: pct(y) }).eq("id", pinId).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Pin nicht gefunden oder keine Berechtigung." };
  return { ok: true };
}

export async function updatePin(pinId: string, raw: Parameters<typeof cleanPinInput>[0]): Promise<Result<{ pin: WikiMapPin }>> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const input: PinInput | { error: string } = cleanPinInput(raw);
  if ("error" in input) return { ok: false, error: input.error };
  const { data, error } = await supabase
    .from("wiki_map_pins")
    .update({ label: input.label, icon: input.icon, page_id: input.pageId, target_map_id: input.targetMapId })
    .eq("id", pinId)
    .select(PIN_COLUMNS)
    .maybeSingle<WikiMapPin>();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Pin nicht gefunden oder keine Berechtigung." };
  done();
  return { ok: true, pin: { ...data, x: Number(data.x), y: Number(data.y) } };
}

export async function deletePin(pinId: string): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const { error, count } = await supabase.from("wiki_map_pins").delete({ count: "exact" }).eq("id", pinId);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "Pin konnte nicht entfernt werden." };
  done();
  return { ok: true };
}
