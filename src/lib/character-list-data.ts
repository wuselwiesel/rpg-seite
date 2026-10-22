import "server-only";
import { createClient } from "@/lib/supabase/server";
import { activeLists } from "@/lib/choice-lists";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";

export type FigureRow = {
  id: string;
  name: string;
  avatarUrl: string | null;
  wikiId: string | null;
  age: string;
  species: string;
  house: string;
  kind: "Spielfigur" | "NPC" | "Frei";
};

const SPECIES_LABEL: Record<string, string> = { mensch: "Mensch", vampir: "Vampir", werwolf: "Werwolf" };

// Alle Figuren einer Welt für die Gesamtliste: Alter (aus dem ChaBo), Wesen (Auswahlliste „Wesen“ bzw. Natur), Haus. Nur Öffentliches.
export async function loadFigureRows(worldId: string): Promise<FigureRow[]> {
  const supabase = await createClient();
  const [{ data: chars }, lists, { data: pages }] = await Promise.all([
    supabase
      .from("characters")
      .select("id, name, avatar_url, house, species, choices, is_npc, vacant")
      .eq("world_id", worldId)
      .is("deleted_at", null)
      .order("name")
      .limit(1000)
      .returns<{ id: string; name: string; avatar_url: string | null; house: string | null; species: string | null; choices: Record<string, string> | null; is_npc: boolean; vacant: boolean }[]>(),
    getWorldChoiceLists(worldId).catch(() => []),
    supabase.from("wiki_pages").select("id, character_id").eq("world_id", worldId).not("character_id", "is", null).returns<{ id: string; character_id: string }[]>(),
  ]);
  const rows = chars ?? [];
  const wiki = new Map((pages ?? []).map((p) => [p.character_id, p.id]));
  const speciesList = activeLists(lists).find((l) => l.isSpecies);

  // Alter steht im ChaBo unter „Persönliches“ (Bezeichnung „Alter“); nur die Zeilen laden, nicht den ganzen Bogen
  const ages = new Map<string, string>();
  for (let i = 0; i < rows.length; i += 100) {
    const ids = rows.slice(i, i + 100).map((r) => r.id);
    const { data: sheets } = await supabase
      .from("character_sheets")
      .select("character_id, personalFields:data->personalFields")
      .in("character_id", ids)
      .returns<{ character_id: string; personalFields: { label?: string; value?: string; secret?: boolean }[] | null }[]>();
    for (const s of sheets ?? []) {
      const f = (s.personalFields ?? []).find((x) => !x.secret && (x.label ?? "").trim().toLowerCase() === "alter" && (x.value ?? "").trim());
      if (f) ages.set(s.character_id, String(f.value).trim());
    }
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    avatarUrl: r.avatar_url,
    wikiId: wiki.get(r.id) ?? null,
    age: ages.get(r.id) ?? "",
    species: (speciesList ? r.choices?.[speciesList.id] : null) ?? SPECIES_LABEL[r.species ?? ""] ?? "",
    house: r.house ?? "",
    kind: r.is_npc ? "NPC" : r.vacant ? "Frei" : "Spielfigur",
  }));
}
