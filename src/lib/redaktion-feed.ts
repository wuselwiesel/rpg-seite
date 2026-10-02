import "server-only";
import { createClient } from "@/lib/supabase/server";
import { escapePostgrestValue } from "@/lib/postgrest";
import { REDAKTION_PAGE_SIZE, type RedaktionFeedPost, type RedaktionFilters } from "@/lib/redaktion-feed-types";
import type { RedaktionPost } from "@/lib/types";

type Row = Omit<RedaktionPost, "poll_options"> & {
  poll_options?: { count: number }[];
  comments?: { count: number }[];
};

// Eine Seite des Redaktions-Feeds (neueste zuerst). `before` = created_at des letzten bereits geladenen Beitrags.
export async function fetchRedaktionPage(filters: RedaktionFilters, before?: string): Promise<RedaktionFeedPost[]> {
  const supabase = await createClient();
  let query = supabase
    .from("redaktion_posts")
    .select(
      "*, author:author_id(id, username, nickname, avatar_url), story_post:story_post_id(id, title), poll_options:redaktion_poll_options(count), comments:redaktion_comments(count)",
    )
    .order("created_at", { ascending: false })
    .limit(REDAKTION_PAGE_SIZE);

  if (before) query = query.lt("created_at", before);
  if (filters.q) query = query.ilike("content", `%${escapePostgrestValue(filters.q)}%`);
  if (filters.tag) query = query.contains("tags", [filters.tag]);
  if (filters.from) query = query.gte("created_at", new Date(filters.from).toISOString());
  if (filters.to) {
    const toDate = new Date(filters.to);
    toDate.setDate(toDate.getDate() + 1);
    query = query.lt("created_at", toDate.toISOString());
  }

  const { data } = await query.returns<Row[]>();
  return (data ?? []).map(({ poll_options, comments, ...post }) => ({
    ...post,
    pollOptionCount: poll_options?.[0]?.count ?? 0,
    commentCount: comments?.[0]?.count ?? 0,
  }));
}
