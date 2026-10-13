"use server";

import { pwnedPasswordError } from "@/lib/pwned-password";
import { redirect } from "next/navigation";
import { cleanPresenceEmoji, cleanPresenceText } from "@/lib/presence-emoji";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NOTIFICATION_TYPE_GROUPS } from "@/lib/notification-types";

const VALID_NOTIFICATION_TYPES = new Set(NOTIFICATION_TYPE_GROUPS.flatMap((g) => g.types));

export async function updateProfile(_prevState: string | null, formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();

  if (username.length < 2) {
    return "Bitte einen Benutzernamen mit mindestens 2 Zeichen angeben.";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: available } = await supabase.rpc("username_available", {
    p_username: username,
    p_exclude_id: user.id,
  });
  if (available === false) {
    return "Dieser Benutzername ist bereits vergeben.";
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      nickname: nickname || null,
      avatar_url: avatarUrl || null,
    })
    .eq("id", user.id);

  if (error) return error.message;

  revalidatePath("/", "layout");
  redirect("/profile/konto?saved=1");
}

// Benachrichtigungs-Einstellungen speichern (Nicht stören, Zusammenfassung, stumme Welten/Charaktere).
export async function saveNotificationPrefs(input: {
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  timezone: string;
  digestEnabled: boolean;
  digestOnly: boolean;
  mutedWorldIds: string[];
  digestWorldIds?: string[];
  mutedCharacterIds: string[];
  mutedNotificationTypes: string[];
  onlyActiveWorld?: boolean;
}): Promise<string | null> {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(input.dndStart) || !time.test(input.dndEnd)) return "Bitte gültige Uhrzeiten angeben.";
  const uuid = /^[0-9a-f-]{36}$/;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  let timezone = "Europe/Berlin";
  try {
    new Intl.DateTimeFormat("de-DE", { timeZone: input.timezone });
    timezone = input.timezone;
  } catch {
    /* Standard behalten */
  }
  const { error } = await supabase.from("notification_prefs").upsert({
    user_id: user.id,
    dnd_enabled: input.dndEnabled,
    dnd_start: input.dndStart,
    dnd_end: input.dndEnd,
    timezone,
    digest_enabled: input.digestEnabled,
    digest_only: input.digestEnabled && input.digestOnly,
    muted_world_ids: input.mutedWorldIds.filter((id) => uuid.test(id)),
    digest_world_ids: input.digestEnabled ? (input.digestWorldIds ?? []).filter((id) => uuid.test(id)) : [],
    muted_character_ids: input.mutedCharacterIds.filter((id) => uuid.test(id)),
    muted_notification_types: input.mutedNotificationTypes.filter((t) => VALID_NOTIFICATION_TYPES.has(t)),
    only_active_world: input.onlyActiveWorld === true,
    updated_at: new Date().toISOString(),
  });
  if (error) return error.message;
  revalidatePath("/profile/benachrichtigungen");
  return null;
}

// Online-Status von Hand: „online“ (sichtbar, solange die App offen ist) oder „offline“ (für andere unsichtbar).
export async function setPresenceMode(mode: "online" | "offline"): Promise<string | null> {
  if (mode !== "online" && mode !== "offline") return "Ungültiger Status.";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.from("profiles").update({ presence_mode: mode }).eq("id", user.id);
  return error ? error.message : null;
}

// Eigenes Emoji (ersetzt den grünen Punkt) und optionaler Text; leer = nur der Punkt.
export async function setPresenceStatus(emoji: string, text: string): Promise<string | null> {
  const cleanEmoji = cleanPresenceEmoji(emoji);
  if (emoji.trim() && !cleanEmoji) return "Bitte nur ein Emoji eintragen.";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.from("profiles").update({ presence_emoji: cleanEmoji, presence_text: cleanPresenceText(text) }).eq("id", user.id);
  return error ? error.message : null;
}

// Passwort ändern: angemeldet genügt, das alte Passwort wird nicht abgefragt.
export async function changePassword(_prevState: string | null, formData: FormData): Promise<string | null> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 6) return "Das Passwort braucht mindestens 6 Zeichen.";
  if (password !== confirm) return "Die beiden Passwörter sind nicht gleich.";
  const pwned = await pwnedPasswordError(password);
  if (pwned) return pwned;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/same.*password|different from the old/i.test(error.message)) return "Das neue Passwort muss sich vom alten unterscheiden.";
    if (/reauth|recent/i.test(error.message)) return "Bitte melde dich einmal ab und wieder an und versuche es dann erneut.";
    return error.message;
  }
  return "ok";
}

// Gelöschte Nachricht oder Beziehung aus dem Papierkorb zurückholen
export async function restoreTrashItem(id: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.rpc("restore_trash_item", { p_id: id });
  if (error) return error.message;
  if (data !== "ok") return typeof data === "string" ? data : "Konnte nicht wiederhergestellt werden.";
  revalidatePath("/story", "layout");
  revalidatePath("/characters/relationships");
  revalidatePath("/profile/papierkorb");
  return null;
}
