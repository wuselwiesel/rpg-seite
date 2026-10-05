import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { characterExcerpt, escapeLike, type CharacterTerm } from "@/lib/character-links";

// Alle Charaktere einer Welt für Links im Wiki (Erwähnungen, [[Name]], Hover-Vorschau).
export const getWorldCharacterTerms = cache(async (worldId: string): Promise<CharacterTerm[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("characters")
    .select("id, name, avatar_url, bio, house")
    .eq("world_id", worldId)
    .is("deleted_at", null)
    .order("name")
    .returns<{ id: string; name: string; avatar_url: string | null; bio: string | null; house: string | null }[]>();
  return (data ?? []).map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatar_url, excerpt: characterExcerpt(c.bio, c.house ?? "") }));
});

export type WikiAboutCharacter = { id: string; title: string; lead: string | null; page_type: string | null; reason: "mention" | "link" | "title" };

// Wiki-Seiten, die eine Figur betreffen: erwähnen sie mit @, verlinken sie mit [[Name]] oder heißen genauso.
export async function getWikiPagesAboutCharacter(character: { id: string; name: string; world_id: string }): Promise<WikiAboutCharacter[]> {
  const supabase = await createClient();
  const cols = "id, title, lead, page_type";
  const base = () => supabase.from("wiki_pages").select(cols).eq("world_id", character.world_id);
  const name = escapeLike(character.name.trim());
  const [mention, link, title] = await Promise.all([
    base().ilike("content", `%data-id="${character.id}"%`).limit(30),
    name ? base().ilike("content", `%[[${name}]]%`).limit(30) : Promise.resolve({ data: [] }),
    name ? base().ilike("title", name).limit(5) : Promise.resolve({ data: [] }),
  ]);
  const out = new Map<string, WikiAboutCharacter>();
  const add = (rows: unknown, reason: WikiAboutCharacter["reason"]) => {
    for (const r of (rows ?? []) as Omit<WikiAboutCharacter, "reason">[]) if (!out.has(r.id)) out.set(r.id, { ...r, reason });
  };
  add(title.data, "title");
  add(mention.data, "mention");
  add(link.data, "link");
  return [...out.values()];
}
