import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { stripHtml } from "@/lib/strip-html";
import type { WikiTerm } from "@/lib/autolink";

// Titel aller Wiki-Seiten einer Welt samt Kurztext für die Vorschau beim Berühren.
export const getWikiTerms = cache(async (worldId: string): Promise<WikiTerm[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("wiki_pages").select("*").eq("world_id", worldId);
  return (data ?? []).map((p) => {
    const text = stripHtml(p.content ?? "");
    return {
      id: p.id,
      title: p.title,
      category: p.category,
      excerpt: text.length > 200 ? `${text.slice(0, 197)}...` : text,
      aliases: (p.aliases as string[] | null) ?? [],
    };
  });
});
