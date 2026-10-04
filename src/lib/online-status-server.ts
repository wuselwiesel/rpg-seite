import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type OwnPresence = { userId: string; mode: "online" | "offline"; emoji: string | null; text: string | null } | null;

// Wer ist angemeldet und wie hat die Person ihren Online-Status eingestellt? (null = nicht angemeldet)
export const getOwnPresence = cache(async (): Promise<OwnPresence> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("presence_mode, presence_emoji, presence_text").eq("id", user.id).maybeSingle<{ presence_mode: string | null; presence_emoji: string | null; presence_text: string | null }>();
  return { userId: user.id, mode: data?.presence_mode === "offline" ? "offline" : "online", emoji: data?.presence_emoji ?? null, text: data?.presence_text ?? null };
});
