"use server";

import { createClient } from "@/lib/supabase/server";

const FONT_ID = /^[a-zA-Z0-9]{1,40}$/;

// Standard-Schrift im Konto speichern (null = zurücksetzen), damit sie auf allen Geräten gilt.
export async function saveDefaultFont(fontId: string | null): Promise<string | null> {
  if (fontId !== null && !FONT_ID.test(fontId)) return "Ungültige Schrift.";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.from("profiles").update({ default_font: fontId }).eq("id", user.id);
  return error ? error.message : null;
}
