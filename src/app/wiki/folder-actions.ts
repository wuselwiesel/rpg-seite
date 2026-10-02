"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";

const MAX_NAME = 60;

function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

function done(): null {
  revalidatePath("/wiki", "layout");
  return null;
}

export async function createWikiFolder(parentId: string | null, rawName: string): Promise<string | null> {
  const name = cleanName(rawName);
  if (!name) return "Bitte einen Namen eingeben.";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const world = await getActiveWorld(user.id);
  if (!world) return "Keine aktive Welt.";
  const { error } = await supabase
    .from("wiki_folders")
    .insert({ world_id: world.id, parent_id: parentId, name, created_by: user.id });
  if (error) return error.message;
  return done();
}

export async function renameWikiFolder(id: string, rawName: string): Promise<string | null> {
  const name = cleanName(rawName);
  if (!name) return "Bitte einen Namen eingeben.";
  const supabase = await createClient();
  const { data, error } = await supabase.from("wiki_folders").update({ name }).eq("id", id).select("id");
  if (error) return error.message;
  if (!data?.length) return "Ordner nicht gefunden oder keine Berechtigung.";
  return done();
}

// parentId null = oberste Ebene. Kreise (in sich selbst oder einen Unterordner) lehnt die Datenbank ab.
export async function moveWikiFolder(id: string, parentId: string | null): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("wiki_folders").update({ parent_id: parentId }).eq("id", id).select("id");
  if (error) return error.message;
  if (!data?.length) return "Ordner nicht gefunden oder keine Berechtigung.";
  return done();
}

// Unterordner und Seiten rücken eine Ebene hoch; nichts wird gelöscht.
export async function deleteWikiFolder(id: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_wiki_folder", { p_id: id });
  if (error) return error.message;
  return done();
}
