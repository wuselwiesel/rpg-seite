"use server";

import { redirect } from "next/navigation";
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
  mutedCharacterIds: string[];
  mutedNotificationTypes: string[];
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
    muted_character_ids: input.mutedCharacterIds.filter((id) => uuid.test(id)),
    muted_notification_types: input.mutedNotificationTypes.filter((t) => VALID_NOTIFICATION_TYPES.has(t)),
    updated_at: new Date().toISOString(),
  });
  if (error) return error.message;
  revalidatePath("/profile/benachrichtigungen");
  return null;
}
