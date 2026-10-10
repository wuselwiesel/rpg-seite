"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostHtml } from "@/lib/sanitize";
import { hasErrors, hasSecrets, normalizeSheet, splitSecrets, stripSecrets, validateSheet } from "@/lib/sheet-rules";
import { syncFamilyRows } from "@/lib/family-sync";
import { diffSheets, mergeWithRecent, type SheetChange } from "@/lib/sheet-diff";

// Speichert den Charakterbogen (nur die Besitzer:in des Charakters, dafür sorgt zusätzlich die RLS).
// Geprüft wird mit denselben Regeln wie in der Oberfläche; bei Fehlern wird nichts gespeichert.
type Supabase = Awaited<ReturnType<typeof createClient>>;

// Zeitfenster, in dem Folgeänderungen desselben Felds durch dieselbe Person zu einer Verlaufszeile werden
const MERGE_WINDOW_MS = 10 * 60 * 1000;

// Schreibt die Änderungen in den Verlauf (Redaktion). Ein Fehler hier darf das Speichern nie verhindern.
async function logSheetChanges(supabase: Supabase, characterId: string, userId: string, changes: SheetChange[]) {
  if (changes.length === 0) return;
  const since = new Date(Date.now() - MERGE_WINDOW_MS).toISOString();
  const { data: recent } = await supabase
    .from("character_sheet_log")
    .select("id, field_key, old_value, new_value")
    .eq("character_id", characterId)
    .eq("actor_id", userId)
    .gt("updated_at", since);
  const byKey = new Map((recent ?? []).map((r) => [r.field_key as string, r]));

  for (const c of changes) {
    const r = byKey.get(c.key);
    const action = mergeWithRecent(r ? { from: r.old_value, to: r.new_value } : null, c);
    if (action.kind === "insert") {
      await supabase.from("character_sheet_log").insert({ character_id: characterId, actor_id: userId, field_key: c.key, field_label: c.label, old_value: c.from, new_value: c.to });
    } else if (r && action.kind === "update") {
      await supabase.from("character_sheet_log").update({ new_value: action.to, updated_at: new Date().toISOString() }).eq("id", r.id);
    } else if (r && action.kind === "remove") {
      await supabase.from("character_sheet_log").delete().eq("id", r.id);
    }
  }
}

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

  const { data: prevRow } = await supabase.from("character_sheets").select("data").eq("character_id", characterId).maybeSingle<{ data: unknown }>();
  const prev = prevRow ? stripSecrets(normalizeSheet(prevRow.data)) : null;
  // Geheimes kommt nie in die für alle lesbare Zeile, sondern in eine eigene (nur für die Besitzer:in)
  const { open, secrets } = splitSecrets(data);
  // Beziehungen im ChaBo und im Beziehungsnetz gleichen sich ab
  open.family = await syncFamilyRows(supabase, user.id, characterId, open.family, prev?.family ?? []);

  const { data: row, error } = await supabase
    .from("character_sheets")
    .upsert({ character_id: characterId, data: open, updated_at: new Date().toISOString() })
    .select("character_id")
    .maybeSingle();
  if (error) return error.message.includes("row-level security") ? "Nur die Besitzer:in des Charakters kann den Bogen ändern." : error.message;
  if (!row) return "Der Bogen konnte nicht gespeichert werden.";

  // Geheimes speichern oder, wenn es keins mehr gibt, die Zeile entfernen
  if (hasSecrets(secrets)) {
    const { error: secretError } = await supabase.from("character_sheet_secrets").upsert({ character_id: characterId, data: secrets, updated_at: new Date().toISOString() });
    if (secretError) return secretError.message;
  } else {
    await supabase.from("character_sheet_secrets").delete().eq("character_id", characterId);
  }

  try {
    // Der Verlauf kennt nur den offenen Teil, Geheimes taucht dort nie auf
    await logSheetChanges(supabase, characterId, user.id, diffSheets(prev, open));
  } catch {
    // Der Verlauf ist nachrangig.
  }

  revalidatePath(`/characters/${characterId}`);
  revalidatePath(`/characters/${characterId}/chabo`);
  revalidatePath("/redaktion/verlauf");
  return null;
}
