import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { normalizeSheet, type SheetData } from "@/lib/sheet-rules";

// Charakterbogen („ChaBo“) eines Charakters oder null, wenn es noch keinen gibt. Sichtbar für alle in der Welt (RLS).
export const getCharacterSheet = cache(async (characterId: string): Promise<SheetData | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("character_sheets").select("data").eq("character_id", characterId).maybeSingle<{ data: unknown }>();
  return data ? normalizeSheet(data.data) : null;
});
