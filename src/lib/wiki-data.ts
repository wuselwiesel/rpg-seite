import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { FolderRow, PageRow } from "@/lib/wiki-tree";
import type { WikiType } from "@/lib/wiki-types";

// Ordner und (schlanke) Seitenliste einer Welt für Navigation und Auswahlfelder. Pro Anfrage nur einmal geladen.
export const getWikiFolders = cache(async (worldId: string): Promise<FolderRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wiki_folders")
    .select("id, parent_id, name, created_by, icon, color")
    .eq("world_id", worldId)
    .returns<FolderRow[]>();
  return data ?? [];
});

export const getWikiPageRows = cache(async (worldId: string): Promise<PageRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wiki_pages")
    .select("id, title, folder_id, parent_page_id, lead, page_type, tags, is_draft, event_year, event_month, event_day, event_end_year, event_end_month, event_end_day, cover_image_url, icon_url, created_at, updated_at, created_by")
    .eq("world_id", worldId)
    .returns<PageRow[]>();
  return data ?? [];
});

export type WikiLinkPage = {
  id: string;
  title: string;
  aliases: string[] | null;
  content: string;
  updated_at: string;
  created_by: string | null;
};

// Alle Seiten samt Text, um Verweise (Rückverweise, rote Links) zu berechnen.
export const getWikiLinkPages = cache(async (worldId: string): Promise<WikiLinkPage[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wiki_pages")
    .select("id, title, aliases, content, updated_at, created_by")
    .eq("world_id", worldId)
    .returns<WikiLinkPage[]>();
  return data ?? [];
});

// Seiten, die die Person als Favorit markiert hat.
export const getWikiFavoriteIds = cache(async (userId: string): Promise<string[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("wiki_favorites").select("page_id").eq("user_id", userId);
  return (data ?? []).map((r) => r.page_id as string);
});

// Seitenarten der Welt (Grundstock plus eigene), in der Reihenfolge der Verwaltung.
export const getWikiTypes = cache(async (worldId: string): Promise<WikiType[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wiki_types")
    .select("id, label, plural, icon, color, hint, fields, outline, portrait, sort_order, created_by")
    .eq("world_id", worldId)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  return (data ?? []).map((t) => ({
    id: t.id,
    label: t.label,
    plural: t.plural,
    icon: t.icon,
    color: t.color,
    hint: t.hint,
    fields: t.fields ?? [],
    outline: t.outline ?? [],
    portrait: t.portrait,
    createdBy: t.created_by,
  }));
});
