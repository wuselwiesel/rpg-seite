import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { EmojiMap } from "@/lib/custom-emoji";

export type CustomEmojiRow = { id: string; world_id: string | null; name: string; image_url: string; created_by: string };

// Alle Emojis (gelten in allen Welten); Namen sind eindeutig.
export const getEmojiMap = cache(async (): Promise<EmojiMap> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  const { data } = await supabase.from("custom_emojis").select("id, world_id, name, image_url, created_by").returns<CustomEmojiRow[]>();
  const map: EmojiMap = {};
  for (const row of data ?? []) map[row.name] = row.image_url;
  return map;
});
