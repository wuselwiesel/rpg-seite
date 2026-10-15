// Ereignisse, über die Besitzer:in und Admins einer Welt Meldungen bekommen. Jede Admin kann sie je Welt einzeln ausschalten.
import type { ChoiceList, ChoiceUsage } from "@/lib/choice-lists";

// Eigene Datei ohne „server-only“, damit Formular und Server dieselbe Liste benutzen.
export type WorldAdminEvent = "member_join" | "character_new" | "npc_new" | "leave" | "entry_full";

export const WORLD_ADMIN_EVENTS: { key: WorldAdminEvent; label: string; type: string }[] = [
  { key: "member_join", label: "Neues Mitglied", type: "world_admin_member" },
  { key: "character_new", label: "Neuer Charakter", type: "world_admin_character" },
  { key: "npc_new", label: "Neuer NPC", type: "world_admin_npc" },
  { key: "leave", label: "Mitglied geht oder Charakter gelöscht", type: "world_admin_leave" },
  { key: "entry_full", label: "Eintrag voll (Höchstzahl erreicht)", type: "world_admin_full" },
];

export const WORLD_ADMIN_NOTIFICATION_TYPES = WORLD_ADMIN_EVENTS.map((e) => e.type);

const KEYS = new Set<string>(WORLD_ADMIN_EVENTS.map((e) => e.key));

// Nur bekannte Ereignisse, ohne Doppelte (für die gespeicherte Liste ausgeschalteter Meldungen)
export function parseMutedEvents(raw: unknown): WorldAdminEvent[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is WorldAdminEvent => typeof x === "string" && KEYS.has(x)))];
}

// Welche Einträge einer Auswahlliste werden durch diese Änderung genau jetzt voll? `usage` ist der Stand VOR dem Speichern,
// `own` die bisherigen Werte des Charakters (ein unveränderter Wert zählt nicht als neu).
export function newlyFullEntries(
  lists: ChoiceList[],
  choices: Record<string, string>,
  usage: ChoiceUsage,
  own: Record<string, string> = {},
): { list: string; entry: string; max: number }[] {
  const out: { list: string; entry: string; max: number }[] = [];
  for (const list of lists) {
    const value = choices[list.id];
    if (!value || list.mode !== "dropdown" || own[list.id] === value) continue;
    const option = list.options.find((o) => o.label === value);
    if (!option || option.maxCount == null || option.maxCount < 1) continue;
    const used = usage[list.id]?.[value] ?? 0;
    if (used < option.maxCount && used + 1 >= option.maxCount) out.push({ list: list.label, entry: value, max: option.maxCount });
  }
  return out;
}
