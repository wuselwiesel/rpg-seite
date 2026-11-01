"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiTypes } from "@/lib/wiki-data";
import { EXTRA_WIKI_TYPES, STANDARD_TYPE_ICONS, newTypeId } from "@/lib/wiki-types";
import { parseFolderColor, parseFolderIcon } from "@/lib/wiki-folder-style";
import { permissionError } from "@/lib/world-permissions";

function lines(raw: FormDataEntryValue | null, max = 20): string[] {
  return Array.from(
    new Set(
      String(raw ?? "")
        .split("\n")
        .map((l) => l.replace(/\s+/g, " ").trim().slice(0, 60))
        .filter(Boolean),
    ),
  ).slice(0, max);
}

function readFields(formData: FormData): { error: string } | { values: Record<string, unknown> } {
  const label = String(formData.get("label") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!label) return { error: "Bitte einen Namen eingeben." };
  const plural = String(formData.get("plural") ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || label;
  const iconRaw = String(formData.get("icon") ?? "").trim();
  const icon = (STANDARD_TYPE_ICONS as readonly string[]).includes(iconRaw) ? iconRaw : (parseFolderIcon(iconRaw) ?? "file-text");
  return {
    values: {
      label,
      plural,
      icon,
      color: parseFolderColor(String(formData.get("color") ?? "")),
      hint: String(formData.get("hint") ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
      fields: lines(formData.get("fields")),
      outline: lines(formData.get("outline")),
      portrait: formData.get("portrait") === "on",
    },
  };
}

async function context(): Promise<{ error: string } | { error: null; supabase: Awaited<ReturnType<typeof createClient>>; user: { id: string }; world: { id: string; created_by: string } }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const world = await getActiveWorld(user.id);
  if (!world) return { error: "Keine aktive Welt." };
  return { error: null, supabase, user, world };
}

function done(): null {
  revalidatePath("/wiki", "layout");
  return null;
}

export async function createWikiType(_prev: string | null, formData: FormData): Promise<string | null> {
  const ctx = await context();
  if (ctx.error !== null) return ctx.error;
  const parsed = readFields(formData);
  if ("error" in parsed) return parsed.error;
  const existing = await getWikiTypes(ctx.world.id);
  const id = newTypeId(String(parsed.values.label), new Set(existing.map((t) => t.id)));
  const { error } = await ctx.supabase
    .from("wiki_types")
    .insert({ ...parsed.values, world_id: ctx.world.id, id, sort_order: existing.length + 1, created_by: ctx.user.id });
  if (error) return permissionError(error);
  return done();
}

// Eine mitgelieferte Zusatzart (EXTRA_WIKI_TYPES) für diese Welt übernehmen; gibt es sie schon, wird die vorhandene zurückgegeben.
export async function addExtraWikiType(extraId: string): Promise<{ id: string } | { error: string }> {
  const ctx = await context();
  if (ctx.error !== null) return { error: ctx.error };
  const extra = EXTRA_WIKI_TYPES.find((t) => t.id === extraId);
  if (!extra) return { error: "Diese Vorlage gibt es nicht." };
  const existing = await getWikiTypes(ctx.world.id);
  const same = existing.find((t) => t.id === extra.id || t.label.toLowerCase() === extra.label.toLowerCase());
  if (same) return { id: same.id };
  const id = newTypeId(extra.id, new Set(existing.map((t) => t.id)));
  const { error } = await ctx.supabase.from("wiki_types").insert({
    world_id: ctx.world.id,
    id,
    label: extra.label,
    plural: extra.plural,
    icon: extra.icon,
    color: extra.color,
    hint: extra.hint,
    fields: extra.fields,
    outline: extra.outline,
    portrait: false,
    sort_order: existing.length + 1,
    created_by: ctx.user.id,
  });
  if (error) return { error: permissionError(error) };
  done();
  return { id };
}

export async function updateWikiType(id: string, _prev: string | null, formData: FormData): Promise<string | null> {
  const ctx = await context();
  if (ctx.error !== null) return ctx.error;
  const parsed = readFields(formData);
  if ("error" in parsed) return parsed.error;
  const { data, error } = await ctx.supabase.from("wiki_types").update(parsed.values).eq("world_id", ctx.world.id).eq("id", id).select("id");
  if (error) return error.message;
  if (!data?.length) return "Seitenart nicht gefunden oder keine Berechtigung.";
  return done();
}

// Seiten dieser Art behalten ihren Inhalt und verlieren nur die Art.
export async function deleteWikiType(id: string): Promise<string | null> {
  const ctx = await context();
  if (ctx.error !== null) return ctx.error;
  const { error } = await ctx.supabase.rpc("delete_wiki_type", { p_world: ctx.world.id, p_id: id });
  if (error) return error.message;
  return done();
}
