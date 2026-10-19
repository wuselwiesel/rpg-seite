import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Ist das Würfeln in dieser Welt eingeschaltet? (Standard: ja; aus = keine Würfelwürfe, keine Attribute/Talente im ChaBo)
export const getWorldDiceEnabled = cache(async (worldId: string): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.from("worlds").select("dice_enabled").eq("id", worldId).maybeSingle<{ dice_enabled: boolean | null }>();
  return data?.dice_enabled !== false;
});

// Ist der Schicksalswürfel in dieser Welt eingeschaltet? (Standard: ja; aus = kein Würfel, keine eigenen Schicksale, keine Felder dafür im Charakterformular)
export const getWorldFateEnabled = cache(async (worldId: string): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.from("worlds").select("fate_enabled").eq("id", worldId).maybeSingle<{ fate_enabled: boolean | null }>();
  return data?.fate_enabled !== false;
});
