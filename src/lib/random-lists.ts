// Eigene Zufallslisten einer Welt (Tabelle world_random_entries): Eingabe parsen, gruppieren, laden.
import type { SupabaseClient } from "@supabase/supabase-js";
import { POOL_KINDS, emptyCustomPools, type CustomPools, type PoolKind } from "@/lib/random-pools";

export const ENTRY_MAX_LENGTH = 200;
export const MAX_ENTRIES_PER_KIND = 500;
export const MAX_ENTRIES_PER_SUBMIT = 200;

export function isPoolKind(v: unknown): v is PoolKind {
  return typeof v === "string" && (POOL_KINDS as readonly string[]).includes(v);
}

// Eine Zeile pro Eintrag: trimmt, kürzt, entfernt Leeres und Doppeltes (ohne Rücksicht auf Groß-/Kleinschreibung), Aufzählungszeichen am Anfang fallen weg.
export function parseEntries(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const text = line.replace(/^\s*(?:[-*•–]\s+|\d+[.)]\s+)/, "").replace(/\s+/g, " ").trim().slice(0, ENTRY_MAX_LENGTH);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= MAX_ENTRIES_PER_SUBMIT) break;
  }
  return out;
}

export function groupEntries(rows: { kind: string; text: string }[]): CustomPools {
  const pools = emptyCustomPools();
  for (const r of rows) if (isPoolKind(r.kind) && r.text.trim()) pools[r.kind].push(r.text);
  return pools;
}

// Alle eigenen Einträge einer Welt als CustomPools (leere Listen, wenn nichts da ist oder der Zugriff fehlt)
export async function fetchRandomLists(supabase: SupabaseClient, worldId: string): Promise<CustomPools> {
  const { data } = await supabase.from("world_random_entries").select("kind, text").eq("world_id", worldId).limit(POOL_KINDS.length * MAX_ENTRIES_PER_KIND);
  return groupEntries((data ?? []) as { kind: string; text: string }[]);
}
