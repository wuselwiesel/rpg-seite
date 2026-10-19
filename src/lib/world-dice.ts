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

// Gibt es in dieser Welt das Feld „Haus / Familie“? (Standard: ja; aus = kein Feld im Charakterformular, keine Haus-Filter in Stammbaum und Beziehungsnetz)
export const getWorldHouseEnabled = cache(async (worldId: string): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.from("worlds").select("house_enabled").eq("id", worldId).maybeSingle<{ house_enabled: boolean | null }>();
  return data?.house_enabled !== false;
});

// Welche Felder der Charaktere hat die Welt ausgeschaltet? Alles in einer Abfrage (Standard: alles an)
export const getWorldCharacterFields = cache(async (worldId: string): Promise<{ fate: boolean; house: boolean; quote: boolean; status: boolean }> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("worlds")
    .select("fate_enabled, house_enabled, quote_enabled, status_enabled")
    .eq("id", worldId)
    .maybeSingle<{ fate_enabled: boolean | null; house_enabled: boolean | null; quote_enabled: boolean | null; status_enabled: boolean | null }>();
  return { fate: data?.fate_enabled !== false, house: data?.house_enabled !== false, quote: data?.quote_enabled !== false, status: data?.status_enabled !== false };
});
