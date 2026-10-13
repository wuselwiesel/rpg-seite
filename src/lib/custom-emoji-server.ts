import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import type { EmojiMap } from "@/lib/custom-emoji";

export type CustomEmojiRow = { id: string; world_id: string | null; name: string; image_url: string; created_by: string; world_only: boolean };

// Emojis der aktiven Welt plus die älteren, weltübergreifenden. Gleicher Name: das Emoji der Welt gewinnt.
export const getEmojiMap = cache(async (): Promise<EmojiMap> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  const world = await getActiveWorld(user.id);
  const { data } = await supabase.from("custom_emojis").select("id, world_id, name, image_url, created_by, world_only").returns<CustomEmojiRow[]>();
  const map: EmojiMap = {};
  const rows = data ?? [];
  for (const row of rows) if (!row.world_only) map[row.name] = row.image_url;
  for (const row of rows) if (row.world_only && row.world_id === world?.id) map[row.name] = row.image_url;
  return map;
});
