import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { stripHtml } from "@/lib/strip-html";
import { getWikiFolders } from "@/lib/wiki-data";
import type { WikiTerm } from "@/lib/autolink";

// Titel aller Wiki-Seiten einer Welt samt Kurztext für die Vorschau beim Berühren.
export const getWikiTerms = cache(async (worldId: string): Promise<WikiTerm[]> => {
  const supabase = await createClient();
  const [{ data }, folders] = await Promise.all([
    supabase.from("wiki_pages").select("*").eq("world_id", worldId),
    getWikiFolders(worldId),
  ]);
  const folderName = new Map(folders.map((f) => [f.id, f.name]));
  return (data ?? []).map((p) => {
    const text = stripHtml(p.content ?? "");
    return {
      id: p.id,
      title: p.title,
      // Beschriftung in der Vorschau: Ordnername, sonst die alte Kategorie.
      category: (p.folder_id && folderName.get(p.folder_id)) || p.category,
      excerpt: (p.lead as string | null)?.trim() || (text.length > 200 ? `${text.slice(0, 197)}...` : text),
      aliases: (p.aliases as string[] | null) ?? [],
      coverImageUrl: p.cover_image_url as string | null,
    };
  });
});
