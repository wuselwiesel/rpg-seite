import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ChoiceList } from "@/lib/choice-lists";

type Row = {
  id: string;
  label: string;
  mode: "dropdown" | "text";
  is_species: boolean;
  sort_order: number;
  world_choice_options: { id: string; label: string; sort_order: number }[];
};

// Alle Auswahllisten einer Welt mit ihren Einträgen (Wesen zuerst, dann nach Reihenfolge und Name).
export async function getWorldChoiceLists(worldId: string): Promise<ChoiceList[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("world_choice_lists")
    .select("id, label, mode, is_species, sort_order, world_choice_options(id, label, sort_order)")
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
        .map((o) => ({ id: o.id, label: o.label })),
    }));
}
