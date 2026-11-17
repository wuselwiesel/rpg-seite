"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostHtml } from "@/lib/sanitize";
import { parseWikiHome } from "@/lib/wiki-home";
import { isDefaultWikiStyle, parseWikiStyle } from "@/lib/wiki-style";
import { isDefaultToc, parseToc, tocDefaultsOnly } from "@/lib/wiki-toc";

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

// Wiki-Design speichern (Besitzer:in und Admins; die Datenbank-Regel für Welten sorgt zusätzlich dafür).
// Das Standard-Design oder `null` entfernt die Einstellung.
export async function saveWikiStyle(worldId: string, raw: string): Promise<string | null> {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "Das Design ist ungültig.";
  }
  const style = parseWikiStyle(parsed);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error, count } = await supabase.from("worlds").update({ wiki_style: style && !isDefaultWikiStyle(style) ? style : null }, { count: "exact" }).eq("id", worldId);
  if (error) return error.message;
  if (!count) return "Das dürfen nur die Besitzer:in und Admins der Welt.";
  revalidatePath("/wiki", "layout");
  return null;
}

// Standard-Inhaltsverzeichnis der Welt speichern (Besitzer:in und Admins). Gilt für alle Seiten ohne eigene Einstellung
// und ohne Standard der Art. Leere Eingabe oder die fest eingebaute Einstellung entfernt es.
export async function saveWikiTocDefault(worldId: string, raw: string): Promise<string | null> {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "Die Einstellung ist ungültig.";
  }
  const toc = parseToc(parsed);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const value = toc && !isDefaultToc(tocDefaultsOnly(toc)) ? tocDefaultsOnly(toc) : null;
  const { error, count } = await supabase.from("worlds").update({ wiki_toc_default: value }, { count: "exact" }).eq("id", worldId);
  if (error) return error.message;
  if (!count) return "Das dürfen nur die Besitzer:in und Admins der Welt.";
  revalidatePath("/wiki", "layout");
  return null;
}
