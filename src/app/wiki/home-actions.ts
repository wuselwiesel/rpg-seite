"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostHtml } from "@/lib/sanitize";
import { parseWikiHome } from "@/lib/wiki-home";

// Wiki-Startseite speichern (Besitzer:in und Admins; die Datenbank-Regel für Welten sorgt zusätzlich dafür).
// Leere Eingabe oder `null` entfernt die Startseite.
export async function saveWikiHome(worldId: string, raw: string): Promise<string | null> {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "Die Startseite ist ungültig.";
  }
  const home = parseWikiHome(parsed, sanitizePostHtml);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error, count } = await supabase.from("worlds").update({ wiki_home: home }, { count: "exact" }).eq("id", worldId);
  if (error) return error.message;
  if (!count) return "Das dürfen nur die Besitzer:in und Admins der Welt.";
  revalidatePath("/wiki");
  revalidatePath("/wiki/uebersicht");
  return null;
}
