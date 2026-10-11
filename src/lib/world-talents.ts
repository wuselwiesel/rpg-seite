import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TALENTS, parseTalentConfig, type TalentDef } from "@/lib/talents";

// Talentliste einer Welt (Standardliste, solange die Besitzer:in sie nicht angepasst hat)
export const getWorldTalents = cache(async (worldId: string): Promise<TalentDef[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("worlds").select("talent_config").eq("id", worldId).maybeSingle<{ talent_config: unknown }>();
  return data?.talent_config ? parseTalentConfig(data.talent_config) : DEFAULT_TALENTS;
});

// … über den Charakter (für Bögen anderer)
export const getCharacterTalents = cache(async (characterId: string): Promise<TalentDef[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("characters").select("world_id").eq("id", characterId).maybeSingle<{ world_id: string }>();
  return data ? getWorldTalents(data.world_id) : DEFAULT_TALENTS;
});
