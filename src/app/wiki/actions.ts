"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { sanitizePostHtml } from "@/lib/sanitize";
import type { WikiCategory } from "@/lib/types";

const CATEGORIES: WikiCategory[] = ["ort", "npc", "fraktion", "sonstiges"];

function parseAliases(raw: FormDataEntryValue | null): string[] {
  return Array.from(
    new Set(
      String(raw ?? "")
        .split(",")
        .map((a) => a.trim().slice(0, 60))
        .filter((a) => a.length >= 2),
    ),
  ).slice(0, 12);
}

export async function createWikiPage(_prevState: string | null, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "sonstiges");
  const rawContent = String(formData.get("content") ?? "").trim();
  const content = sanitizePostHtml(rawContent);

  if (!title) return "Titel darf nicht leer sein.";
  if (!CATEGORIES.includes(category as WikiCategory)) return "Ungültige Kategorie.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) return "Keine aktive Welt.";

  const { data, error } = await supabase
    .from("wiki_pages")
    .insert({ world_id: activeWorld.id, category, title, content, aliases: parseAliases(formData.get("aliases")), created_by: user.id })
    .select("id")
    .single();

  if (error || !data) return error?.message ?? "Seite konnte nicht erstellt werden.";

  revalidatePath("/wiki");
  redirect(`/wiki/${data.id}`);
}

export async function updateWikiPage(
  wikiPageId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "sonstiges");
  const rawContent = String(formData.get("content") ?? "").trim();
  const content = sanitizePostHtml(rawContent);

  if (!title) return "Titel darf nicht leer sein.";
  if (!CATEGORIES.includes(category as WikiCategory)) return "Ungültige Kategorie.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error } = await supabase
    .from("wiki_pages")
    .update({ title, category, content, aliases: parseAliases(formData.get("aliases")), updated_at: new Date().toISOString() })
    .eq("id", wikiPageId);

  if (error) return error.message;

  revalidatePath("/wiki");
  revalidatePath(`/wiki/${wikiPageId}`);
  redirect(`/wiki/${wikiPageId}`);
}

export async function deleteWikiPage(wikiPageId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase
    .from("wiki_pages")
    .delete({ count: "exact" })
    .eq("id", wikiPageId);

  if (error) return error.message;
  if (!count) return "Seite konnte nicht gelöscht werden.";

  revalidatePath("/wiki");
  return null;
}
