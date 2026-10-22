"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_FOLDER_DEPTH, canMoveFolder, folderPath, type FolderLike } from "@/lib/folder-tree";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function worldFolders(supabase: Supabase, worldId: string): Promise<FolderLike[]> {
  const { data } = await supabase.from("story_folders").select("id, name, parent_id").eq("world_id", worldId);
  return ((data ?? []) as { id: string; name: string; parent_id: string | null }[]).map((f) => ({ id: f.id, name: f.name, parentId: f.parent_id }));
}

function refresh() {
  revalidatePath("/story");
  revalidatePath("/story/ordnung");
}

export async function createSceneFolder(worldId: string, name: string, parentId: string | null = null): Promise<{ error: string } | { folder: FolderLike }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  const clean = name.trim().slice(0, 60);
  if (!clean) return { error: "Bitte einen Namen eingeben." };
  const all = await worldFolders(supabase, worldId);
  if (parentId) {
    if (!all.some((f) => f.id === parentId)) return { error: "Der Ordner existiert nicht mehr." };
    if (folderPath(all, parentId).length >= MAX_FOLDER_DEPTH) return { error: `Ordner lassen sich höchstens ${MAX_FOLDER_DEPTH} Ebenen tief verschachteln.` };
  }
  const siblings = all.filter((f) => f.parentId === parentId).length;
  const { data, error } = await supabase
    .from("story_folders")
    .insert({ world_id: worldId, parent_id: parentId, name: clean, position: siblings, created_by: user.id })
    .select("id, name, parent_id")
    .single<{ id: string; name: string; parent_id: string | null }>();
  if (error || !data) {
    if (error?.code === "23505") return { error: "Diesen Ordner gibt es hier schon." };
    return { error: error?.code === "42501" ? "Nur Mitglieder der Welt können Ordner anlegen." : (error?.message ?? "Konnte nicht angelegt werden.") };
  }
  refresh();
  return { folder: { id: data.id, name: data.name, parentId: data.parent_id } };
}

export async function renameSceneFolder(id: string, name: string): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const clean = name.trim().slice(0, 60);
  if (!clean) return "Bitte einen Namen eingeben.";
  const { data, error } = await supabase.from("story_folders").update({ name: clean }).eq("id", id).select("id");
  if (error) return error.code === "23505" ? "Diesen Ordner gibt es hier schon." : error.message;
  if (!data?.length) return "Nur wer den Ordner angelegt hat oder Welt-Admin ist, kann ihn ändern.";
  refresh();
  return null;
}

// Ordner verschieben (null = oberste Ebene): kein Kreis, höchstens drei Ebenen
export async function moveSceneFolder(worldId: string, id: string, parentId: string | null): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const all = await worldFolders(supabase, worldId);
  if (!all.some((f) => f.id === id)) return "Ordner nicht gefunden.";
  if (!canMoveFolder(all, id, parentId)) return "Dorthin lässt sich der Ordner nicht verschieben.";
  const position = all.filter((f) => f.parentId === parentId).length;
  const { data, error } = await supabase.from("story_folders").update({ parent_id: parentId, position }).eq("id", id).select("id");
  if (error) return error.code === "23505" ? "Dort gibt es schon einen Ordner mit diesem Namen." : error.message;
  if (!data?.length) return "Nur wer den Ordner angelegt hat oder Welt-Admin ist, kann ihn verschieben.";
  refresh();
  return null;
}

// Reihenfolge der Ordner auf einer Ebene speichern
export async function reorderSceneFolders(orderedIds: string[]): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const ids = orderedIds.filter((i) => /^[0-9a-f-]{36}$/i.test(i)).slice(0, 200);
  const results = await Promise.all(ids.map((id, position) => supabase.from("story_folders").update({ position }).eq("id", id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return failed.error.message;
  refresh();
  return null;
}

// Szenen im Ordner bleiben erhalten (ohne Ordner); Unterordner werden mitgelöscht
export async function deleteSceneFolder(id: string): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.from("story_folders").delete().eq("id", id).select("id");
  if (error) return error.message;
  if (!data?.length) return "Nur wer den Ordner angelegt hat oder Welt-Admin ist, kann ihn löschen.";
  refresh();
  return null;
}

// Szenen in einen Ordner legen (null = ohne Ordner) und ihre Reihenfolge dort festhalten. Geändert werden nur Szenen, die man bearbeiten darf.
export async function saveSceneOrder(worldId: string, folderId: string | null, orderedIds: string[]): Promise<{ error: string } | { skipped: string[] }> {
  const { supabase, user } = await authed();
  if (!user) return { error: "Nicht angemeldet." };
  const ids = orderedIds.filter((i) => /^[0-9a-f-]{36}$/i.test(i)).slice(0, 300);
  if (folderId) {
    const { data: f } = await supabase.from("story_folders").select("id").eq("id", folderId).eq("world_id", worldId).maybeSingle();
    if (!f) return { error: "Der Ordner existiert nicht mehr." };
  }
  const results = await Promise.all(
    ids.map((id, i) => supabase.from("story_posts").update({ folder_id: folderId, sort_order: i }).eq("id", id).eq("world_id", worldId).select("id")),
  );
  const firstError = results.find((r) => r.error);
  if (firstError?.error) return { error: firstError.error.message };
  const skipped = ids.filter((_, i) => !results[i].data?.length);
  refresh();
  return { skipped };
}

// Eine Szene in einen anderen Ordner legen (null = ohne Ordner); sie steht dort zuletzt. Nur Autor:in oder Welt-Admin (RLS).
export async function setSceneFolder(worldId: string, sceneId: string, folderId: string | null): Promise<string | null> {
  const { supabase, user } = await authed();
  if (!user) return "Nicht angemeldet.";
  if (folderId) {
    const { data: f } = await supabase.from("story_folders").select("id").eq("id", folderId).eq("world_id", worldId).maybeSingle();
    if (!f) return "Der Ordner existiert nicht mehr.";
  }
  let q = supabase.from("story_posts").select("sort_order").eq("world_id", worldId).not("sort_order", "is", null).order("sort_order", { ascending: false }).limit(1);
  q = folderId ? q.eq("folder_id", folderId) : q.is("folder_id", null);
  const { data: top } = await q.maybeSingle<{ sort_order: number }>();
  const { data, error } = await supabase
    .from("story_posts")
    .update({ folder_id: folderId, sort_order: (top?.sort_order ?? -1) + 1 })
    .eq("id", sceneId)
    .eq("world_id", worldId)
    .select("id");
  if (error) return error.message;
  if (!data?.length) return "Nur die Autor:in der Szene oder Welt-Admins können sie in einen Ordner legen.";
  revalidatePath(`/story/${sceneId}`);
  refresh();
  return null;
}
