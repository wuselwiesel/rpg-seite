"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter } from "@/lib/active-character";
import { fetchFeedPage } from "@/lib/feed";
import type { FeedFilters, FeedPost } from "@/lib/feed-types";

// Nachladen beim Scrollen: die nächste Seite älterer Beiträge.
export async function loadMorePosts(filters: FeedFilters, before: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const world = await getActiveWorld(user.id);
  const character = world ? await getActiveCharacter(user.id, world.id) : null;
  if (!world) return [];
  // Ohne Charakter wird nur gelesen (kein „gefällt mir“-Stand)
  return fetchFeedPage(filters, character?.id ?? "", world.id, before);
}
