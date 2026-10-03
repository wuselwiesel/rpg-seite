import "server-only";
import { createClient } from "@/lib/supabase/server";
import { escapePostgrestValue } from "@/lib/postgrest";
import { aggregateReactions } from "@/lib/reactions";
import type { Character, Post } from "@/lib/types";
import { FEED_PAGE_SIZE, type FeedFilters, type FeedPost } from "@/lib/feed-types";


export const POST_SELECT =
  "*, characters!posts_character_id_fkey(*, worlds(name)), comments(count), reactions(emoji, character_id, characters(name)), story_post:story_post_id(id, title), post_tags(characters(id, name, username))";

export function toFeedPost(post: Post, activeCharacterId: string, activeWorldId: string): FeedPost {
  const withWorld = post.characters as (Character & { worlds?: { name: string } | null }) | null;
  return {
    id: post.id,
    characterId: post.character_id,
    character: post.characters,
    title: post.title,
    content: post.content,
    createdAt: post.created_at,
    replyCount: post.comments?.[0]?.count ?? 0,
    worldName: withWorld && withWorld.world_id !== activeWorldId ? withWorld.worlds?.name : undefined,
    reactions: aggregateReactions(post.reactions, new Set([activeCharacterId])),
    tags: post.tags,
    mediaUrl: post.media_url ?? null,
    mediaType: post.media_type ?? null,
    mediaUrls: post.media_urls ?? null,
    storyPost: post.story_post ?? null,
    pinned: post.pinned ?? false,
    tagged: (post.post_tags ?? []).map((t) => t.characters).filter((c): c is NonNullable<typeof c> => !!c),
    bonusLikes: post.bonus_likes ?? 0,
  };
}

// Eine Seite des Feeds (neueste zuerst). `before` = created_at des letzten bereits geladenen Beitrags.
export async function fetchFeedPage(
  filters: FeedFilters,
  activeCharacterId: string,
  activeWorldId: string,
  before?: string,
): Promise<FeedPost[]> {
  const supabase = await createClient();
  // Der Feed zeigt nur Beiträge von Charakteren der ausgewählten Welt (innerer Join auf den Charakter).
  let query = supabase
    .from("posts")
    .select(POST_SELECT.replace("characters!posts_character_id_fkey(", "characters!posts_character_id_fkey!inner("))
    .eq("characters.world_id", activeWorldId)
    .lte("publish_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (before) query = query.lt("created_at", before);
  if (filters.q) {
    const escaped = escapePostgrestValue(filters.q);
    query = query.or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%`);
  }
  if (filters.tag) query = query.contains("tags", [filters.tag]);
  if (filters.from) query = query.gte("created_at", new Date(filters.from).toISOString());
  if (filters.to) {
    const toDate = new Date(filters.to);
    toDate.setDate(toDate.getDate() + 1);
    query = query.lt("created_at", toDate.toISOString());
  }

  const { data } = await query.returns<Post[]>();
  return (data ?? []).map((p) => toFeedPost(p, activeCharacterId, activeWorldId));
}
