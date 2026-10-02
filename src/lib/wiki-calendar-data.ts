import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { normalizeCalendar, type WikiCalendar } from "@/lib/wiki-calendar";

// Kalender der Welt (ohne Einstellung der gewöhnliche). Die ungecachte Fassung ist für Server-Aktionen, die gerade speichern.
export async function loadWikiCalendar(worldId: string): Promise<WikiCalendar> {
  const supabase = await createClient();
  const { data } = await supabase.from("wiki_calendars").select("months, era").eq("world_id", worldId).maybeSingle<{ months: unknown; era: string | null }>();
  return normalizeCalendar(data?.months, data?.era);
}

export const getWikiCalendar = cache(loadWikiCalendar);
