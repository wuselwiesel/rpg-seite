import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { characterExcerpt, escapeLike, type CharacterTerm } from "@/lib/character-links";
import { getCharacterSheet } from "@/lib/character-sheet-data";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { listCharacterFields, type ProfileFields } from "@/lib/character-fields";

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
  const [own, mention, link, title] = await Promise.all([
    base().eq("character_id", character.id).limit(1),
    base().ilike("content", `%data-id="${character.id}"%`).limit(30),
    name ? base().ilike("content", `%[[${name}]]%`).limit(30) : Promise.resolve({ data: [] }),
    name ? base().ilike("title", name).limit(5) : Promise.resolve({ data: [] }),
  ]);
  const out = new Map<string, WikiAboutCharacter>();
  const add = (rows: unknown, reason: WikiAboutCharacter["reason"]) => {
    for (const r of (rows ?? []) as Omit<WikiAboutCharacter, "reason">[]) if (!out.has(r.id)) out.set(r.id, { ...r, reason });
  };
  add(own.data, "title");
  add(title.data, "title");
  add(mention.data, "mention");
  add(link.data, "link");
  return [...out.values()];
}

export type CharacterWikiRow = { icon: string; title: string; text: string };

// Die öffentlichen Angaben aus dem ChaBo und Profil als Steckbrief-Zeilen für die Wiki-Seite einer Figur (immer live, ohne Attribute,
// Talente, Notizen und nie Geheimes). Leere Angaben fehlen.
export async function getCharacterWikiRows(characterId: string): Promise<{ rows: CharacterWikiRow[]; hasSheet: boolean }> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("characters")
    .select("name, bio, house, quote, status_text, gender, choices, world_id, worlds(house_enabled, quote_enabled, status_enabled)")
    .eq("id", characterId)
    .maybeSingle<ProfileFields & { world_id: string; worlds: { house_enabled: boolean | null; quote_enabled: boolean | null; status_enabled: boolean | null } | null }>();
  if (!c) return { rows: [], hasSheet: false };
  const [lists, sheet] = await Promise.all([getWorldChoiceLists(c.world_id).catch(() => []), getCharacterSheet(characterId, false)]);
  const w = c.worlds;
  const fields = listCharacterFields(c, lists, sheet, { house: w?.house_enabled !== false, quote: false, status: false });
  const wanted = (g: string) => g === "Auswahllisten" || g === "ChaBo: Persönliches" || (g.startsWith("ChaBo: ") && !["ChaBo: Attribute", "ChaBo: Talente", "ChaBo: Notizen"].includes(g) && g !== "Profil");
  const rows: CharacterWikiRow[] = [];
  for (const f of fields) {
    const value = f.value.trim();
    if (!value || f.key === "s:familyTitle") continue;
    if (f.group === "Profil" ? ["p:house", "p:gender"].includes(f.key) : wanted(f.group)) rows.push({ icon: "", title: f.label, text: value });
  }
  return { rows, hasSheet: !!sheet };
}
