import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Standard-Schrift der angemeldeten Person (null = keine gesetzt oder Migration noch nicht eingespielt).
export const getAccountDefaultFont = cache(async (): Promise<{ loggedIn: boolean; fontId: string | null }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { loggedIn: false, fontId: null };
  const { data, error } = await supabase.from("profiles").select("default_font").eq("id", user.id).maybeSingle();
  return { loggedIn: true, fontId: error ? null : ((data as { default_font: string | null } | null)?.default_font ?? null) };
});
