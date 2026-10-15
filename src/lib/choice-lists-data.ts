import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ChoiceList, ChoiceUsage } from "@/lib/choice-lists";

type Row = {
  id: string;
  label: string;
  mode: "dropdown" | "text";
  is_species: boolean;
  sort_order: number;
  world_choice_options: { id: string; label: string; sort_order: number; max_count: number | null }[];
};

// Alle Auswahllisten einer Welt mit ihren Einträgen (Wesen zuerst, dann nach Reihenfolge und Name).
// withUsage: je Eintrag auch, wie viele Charaktere ihn schon haben (für Höchstzahlen und die Auswahl im Formular)
export async function getWorldChoiceLists(worldId: string, withUsage = false): Promise<ChoiceList[]> {
  const supabase = await createClient();
  const usage = withUsage ? await getChoiceUsage(worldId) : null;
  const { data } = await supabase
    .from("world_choice_lists")
    .select("id, label, mode, is_species, sort_order, world_choice_options(id, label, sort_order, max_count)")
    .eq("world_id", worldId)
    .returns<Row[]>();
  return (data ?? [])
    .sort((a, b) => Number(b.is_species) - Number(a.is_species) || a.sort_order - b.sort_order || a.label.localeCompare(b.label, "de"))
    .map((l) => ({
      id: l.id,
      label: l.label,
      mode: l.mode,
      isSpecies: l.is_species,
      options: [...l.world_choice_options]
        .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, "de"))
        .map((o) => ({ id: o.id, label: o.label, maxCount: o.max_count, ...(usage ? { used: usage[l.id]?.[o.label] ?? 0 } : {}) })),
    }));
}

// Wie oft ist welcher Listeneintrag in der Welt vergeben (nicht gelöschte Charaktere, auch NPCs)?
export async function getChoiceUsage(worldId: string): Promise<ChoiceUsage> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("characters")
    .select("choices")
    .eq("world_id", worldId)
    .is("deleted_at", null)
    .not("choices", "is", null)
    .limit(5000)
    .returns<{ choices: Record<string, unknown> | null }[]>();
  const usage: ChoiceUsage = {};
  for (const row of data ?? []) {
    for (const [listId, value] of Object.entries(row.choices ?? {})) {
      if (typeof value !== "string" || !value) continue;
      usage[listId] ??= {};
      usage[listId][value] = (usage[listId][value] ?? 0) + 1;
    }
  }
  return usage;
}
