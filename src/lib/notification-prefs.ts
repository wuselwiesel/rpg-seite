import "server-only";
import { createClient } from "@/lib/supabase/server";

export type NotificationPrefs = {
  user_id: string;
  dnd_enabled: boolean;
  dnd_start: string;
  dnd_end: string;
  timezone: string;
  digest_enabled: boolean;
  digest_only: boolean;
  muted_world_ids: string[];
  muted_character_ids: string[];
};

export const DEFAULT_PREFS: Omit<NotificationPrefs, "user_id"> = {
  dnd_enabled: false,
  dnd_start: "22:00",
  dnd_end: "08:00",
  timezone: "Europe/Berlin",
  digest_enabled: false,
  digest_only: false,
  muted_world_ids: [],
  muted_character_ids: [],
};

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function nowMinutesIn(timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(new Date());
    return minutes(parts);
  } catch {
    return minutes(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Berlin" }).format(new Date()));
  }
}

export function inQuietHours(prefs: Pick<NotificationPrefs, "dnd_enabled" | "dnd_start" | "dnd_end" | "timezone">): boolean {
  if (!prefs.dnd_enabled) return false;
  const now = nowMinutesIn(prefs.timezone);
  const start = minutes(prefs.dnd_start);
  const end = minutes(prefs.dnd_end);
  if (start === end) return false;
  return start < end ? now >= start && now < end : now >= start || now < end;
}

// Soll für diese Empfänger:in gerade KEIN Push rausgehen? (Nicht stören, nur Zusammenfassung, Welt/Charakter stumm)
export async function shouldSuppressPush(
  userId: string,
  target: { recipientName?: string | null; recipientCharacterId?: string | null },
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_notification_prefs", { p_user_id: userId });
  const prefs = (Array.isArray(data) ? data[0] : data) as NotificationPrefs | null | undefined;
  if (!prefs) return false;
  if (prefs.digest_only) return true;
  if (inQuietHours(prefs)) return true;
  if (prefs.muted_world_ids.length === 0 && prefs.muted_character_ids.length === 0) return false;

  let characters: { id: string; world_id: string }[] = [];
  if (target.recipientCharacterId) {
    const { data: c } = await supabase.from("characters").select("id, world_id").eq("id", target.recipientCharacterId);
    characters = c ?? [];
  } else if (target.recipientName) {
    const names = target.recipientName.split(",").map((n) => n.trim()).filter(Boolean);
    const { data: c } = await supabase.from("characters").select("id, world_id").eq("owner_id", userId).in("name", names);
    characters = c ?? [];
  }
  if (characters.length === 0) return false;
  // Stumm nur, wenn alle betroffenen Charaktere stumm sind (Charakter selbst oder seine Welt).
  return characters.every((c) => prefs.muted_character_ids.includes(c.id) || prefs.muted_world_ids.includes(c.world_id));
}
