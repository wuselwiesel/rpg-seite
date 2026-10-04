import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mergeSecrets, normalizeSheet, parseSecrets, stripSecrets, type SheetData } from "@/lib/sheet-rules";

// Charakterbogen („ChaBo“) eines Charakters oder null, wenn es noch keinen gibt. Sichtbar für alle in der Welt (RLS).
// Geheimes liegt in einer eigenen Tabelle und kommt nur mit withSecrets (nur die Besitzer:in bekommt dort überhaupt Zeilen).
export const getCharacterSheet = cache(async (characterId: string, withSecrets = false): Promise<SheetData | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("character_sheets").select("data").eq("character_id", characterId).maybeSingle<{ data: unknown }>();
  if (!data) return null;
  const open = stripSecrets(normalizeSheet(data.data));
  if (!withSecrets) return open;
  const { data: secret } = await supabase.from("character_sheet_secrets").select("data").eq("character_id", characterId).maybeSingle<{ data: unknown }>();
  return secret ? mergeSecrets(open, parseSecrets(secret.data)) : open;
});
