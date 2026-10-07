"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { MAX_ENTRIES_PER_KIND, isPoolKind, parseEntries } from "@/lib/random-lists";

// Mehrere Einträge auf einmal (eine Zeile pro Eintrag). Doppelte (auch ohne Rücksicht auf Groß-/Kleinschreibung) werden übersprungen.
export async function addRandomEntries(kind: string, raw: string): Promise<{ added: number; skipped: number } | { error: string }> {
  if (!isPoolKind(kind)) return { error: "Unbekannte Liste." };
  const entries = parseEntries(raw);
  if (entries.length === 0) return { error: "Gib mindestens einen Eintrag ein." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const world = await getActiveWorld(user.id);
  if (!world) return { error: "Wähle zuerst eine Welt." };

  const { data: existing, error: readError } = await supabase.from("world_random_entries").select("text").eq("world_id", world.id).eq("kind", kind);
  if (readError) return { error: readError.message };
  const have = new Set((existing ?? []).map((r) => (r.text as string).toLowerCase()));
  const fresh = entries.filter((e) => !have.has(e.toLowerCase()));
  if (have.size + fresh.length > MAX_ENTRIES_PER_KIND) return { error: `Pro Liste sind höchstens ${MAX_ENTRIES_PER_KIND} Einträge möglich.` };
  if (fresh.length === 0) return { added: 0, skipped: entries.length };

  const { error } = await supabase.from("world_random_entries").insert(fresh.map((text) => ({ world_id: world.id, kind, text, created_by: user.id })));
  if (error) return { error: error.code === "23505" ? "Mindestens ein Eintrag existiert schon. Bitte erneut versuchen." : error.message };

  revalidatePath("/profile/zufallslisten");
  return { added: fresh.length, skipped: entries.length - fresh.length };
}

export async function deleteRandomEntry(id: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error, count } = await supabase.from("world_random_entries").delete({ count: "exact" }).eq("id", id);
  if (error) return error.message;
  if (!count) return "Konnte nicht gelöscht werden.";
  revalidatePath("/profile/zufallslisten");
  return null;
}

// Einen eigenen Eintrag ändern (die Datenbank erlaubt es nur der Person, die ihn angelegt hat, und der Welt-Besitzerin)
export async function updateRandomEntry(id: string, raw: string): Promise<string | null> {
  const [text] = parseEntries(raw);
  if (!text) return "Der Eintrag darf nicht leer sein.";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data: row } = await supabase.from("world_random_entries").select("world_id, kind").eq("id", id).maybeSingle<{ world_id: string; kind: string }>();
  if (!row) return "Eintrag nicht gefunden.";
  const { data: same } = await supabase.from("world_random_entries").select("id").eq("world_id", row.world_id).eq("kind", row.kind).ilike("text", text.replace(/[\\%_]/g, (m) => `\\${m}`)).neq("id", id).limit(1);
  if (same?.length) return "Diesen Eintrag gibt es in der Liste schon.";
  const { error, count } = await supabase.from("world_random_entries").update({ text }, { count: "exact" }).eq("id", id);
  if (error) return error.code === "23505" ? "Diesen Eintrag gibt es in der Liste schon." : error.message;
  if (!count) return "Das darfst du nicht ändern.";
  revalidatePath("/profile/zufallslisten");
  return null;
}
