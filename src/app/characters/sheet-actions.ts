"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostHtml } from "@/lib/sanitize";
import { hasErrors, normalizeSheet, validateSheet } from "@/lib/sheet-rules";

// Speichert den Charakterbogen (nur die Besitzer:in des Charakters, dafür sorgt zusätzlich die RLS).
// Geprüft wird mit denselben Regeln wie in der Oberfläche; bei Fehlern wird nichts gespeichert.
export async function saveCharacterSheet(characterId: string, raw: unknown): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const data = normalizeSheet(raw);
  const errors = validateSheet(data);
  if (hasErrors(errors)) return errors.budget[0] ?? "Einige Werte sind ungültig.";
  data.notesBlocks = data.notesBlocks.map((b) => ({ label: b.label, html: sanitizePostHtml(b.html) }));

  const { data: row, error } = await supabase
    .from("character_sheets")
    .upsert({ character_id: characterId, data, updated_at: new Date().toISOString() })
    .select("character_id")
    .maybeSingle();
  if (error) return error.message.includes("row-level security") ? "Nur die Besitzer:in des Charakters kann den Bogen ändern." : error.message;
  if (!row) return "Der Bogen konnte nicht gespeichert werden.";

  revalidatePath(`/characters/${characterId}`);
  revalidatePath(`/characters/${characterId}/chabo`);
  return null;
}
