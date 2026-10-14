import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_NATURES, parseNatureConfig, type NatureDef } from "@/lib/natures";

// Besondere Naturen einer Welt (die zwei Standard-Naturen, solange die Besitzer:in sie nicht angepasst hat)
export const getWorldNatures = cache(async (worldId: string): Promise<NatureDef[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("worlds").select("nature_config").eq("id", worldId).maybeSingle<{ nature_config: unknown }>();
  return data?.nature_config != null ? parseNatureConfig(data.nature_config) : DEFAULT_NATURES;
});

// … über den Charakter (für Bögen anderer)
export const getCharacterNatures = cache(async (characterId: string): Promise<NatureDef[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("characters").select("world_id").eq("id", characterId).maybeSingle<{ world_id: string }>();
  return data ? getWorldNatures(data.world_id) : DEFAULT_NATURES;
});
