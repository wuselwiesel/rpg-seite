"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { parseCalendarMonths } from "@/lib/wiki-calendar";

// Kalender der aktiven Welt speichern. Mitglieder dürfen ihn ändern (wie Wiki-Seiten); bestehende Daten bleiben gespeichert
// und werden bei Monaten, die es nicht mehr gibt, als „Monat N“ angezeigt.
export async function saveWikiCalendar(input: { months: { name: string; days: string }[]; era: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  const world = await getActiveWorld(user.id);
  if (!world) return { ok: false, error: "Keine aktive Welt." };
  const months = parseCalendarMonths(input.months);
  if ("error" in months) return { ok: false, error: months.error };
  const era = (input.era ?? "").replace(/\s+/g, " ").trim().slice(0, 40) || null;
  const { error } = await supabase
    .from("wiki_calendars")
    .upsert({ world_id: world.id, months, era, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "world_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/wiki", "layout");
  return { ok: true };
}
