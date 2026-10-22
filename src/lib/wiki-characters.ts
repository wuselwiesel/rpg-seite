import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { characterExcerpt, escapeLike, type CharacterTerm } from "@/lib/character-links";
import { getCharacterSheet } from "@/lib/character-sheet-data";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { listCharacterFields, type ProfileFields } from "@/lib/character-fields";
import { MENTION_REGEX } from "@/lib/mentions";

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
export async function getCharacterWikiRows(characterId: string): Promise<{ rows: CharacterWikiRow[]; hasSheet: boolean; enabled: boolean; portraitUrl: string | null; avatarUrl: string | null }> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("characters")
    .select("name, avatar_url, bio, house, quote, status_text, gender, choices, world_id, worlds(house_enabled, quote_enabled, status_enabled, character_wiki_enabled)")
    .eq("id", characterId)
    .maybeSingle<ProfileFields & { avatar_url: string | null; world_id: string; worlds: { house_enabled: boolean | null; quote_enabled: boolean | null; status_enabled: boolean | null; character_wiki_enabled: boolean | null } | null }>();
  // Nur in Welten, die die Option eingeschaltet haben (sonst bleibt eine ältere, nur verknüpfte Seite einfach eine normale Seite)
  if (!c || c.worlds?.character_wiki_enabled !== true) return { rows: [], hasSheet: false, enabled: false, portraitUrl: null, avatarUrl: null };
  const [lists, sheet] = await Promise.all([getWorldChoiceLists(c.world_id).catch(() => []), getCharacterSheet(characterId, false)]);
  const w = c.worlds;
  const fields = listCharacterFields(c, lists, sheet, { house: w?.house_enabled !== false, quote: false, status: false });
  const wanted = (g: string) => g === "Auswahllisten" || g === "ChaBo: Persönliches" || (g.startsWith("ChaBo: ") && !["ChaBo: Attribute", "ChaBo: Talente", "ChaBo: Notizen"].includes(g) && g !== "Profil");
  // Die eigene Erwähnung („Meru @Meru Burns“) gehört nicht in den Steckbrief der Figur selbst
  const selfMention = new RegExp(`\\s*@${c.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gi");
  const rows: CharacterWikiRow[] = [];
  for (const f of fields) {
    const value = f.value.replace(MENTION_REGEX, "$1").replace(selfMention, "").trim();
    if (!value || f.key === "s:familyTitle") continue;
    if (f.group === "Profil" ? ["p:house", "p:gender"].includes(f.key) : wanted(f.group)) rows.push({ icon: "", title: f.label, text: value });
  }
  return { rows, hasSheet: !!sheet, enabled: true, portraitUrl: sheet?.portraitUrl ?? null, avatarUrl: c.avatar_url };
}
