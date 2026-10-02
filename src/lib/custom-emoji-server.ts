import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import type { EmojiMap } from "@/lib/custom-emoji";

export type CustomEmojiRow = { id: string; world_id: string; name: string; image_url: string; created_by: string };

// Alle Emojis aus den Welten der Person (per RLS); bei gleichem Namen gewinnt die aktive Welt.
export const getEmojiMap = cache(async (): Promise<EmojiMap> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  const [{ data }, world] = await Promise.all([
    supabase.from("custom_emojis").select("id, world_id, name, image_url, created_by").returns<CustomEmojiRow[]>(),
    getActiveWorld(user.id),
  ]);
  const map: EmojiMap = {};
  for (const row of data ?? []) if (!map[row.name] || row.world_id === world?.id) map[row.name] = row.image_url;
  return map;
});
