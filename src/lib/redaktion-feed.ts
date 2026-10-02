import "server-only";
import { createClient } from "@/lib/supabase/server";
import { escapePostgrestValue } from "@/lib/postgrest";
import {
  REDAKTION_PAGE_SIZE,
  type FeedPollOption,
  type RedaktionFeedPost,
  type RedaktionFilters,
} from "@/lib/redaktion-feed-types";
import type { ReactionSummary } from "@/lib/reactions";
import type { RedaktionPost } from "@/lib/types";

type OptionRow = {
  id: string;
  label: string;
  position: number;
  character: { id: string; name: string; avatar_url: string | null } | null;
  votes: { voter_id: string; voter: { id: string; username: string; nickname: string | null } | null }[];
};

type ReactionRow = { emoji: string; user_id: string; profiles: { username: string; nickname: string | null } | null };

type Row = Omit<RedaktionPost, "poll_options"> & {
  poll_options?: OptionRow[];
  comments?: { count: number }[];
  reactions?: ReactionRow[];
};

export function summarizeReactions(rows: ReactionRow[] | undefined, userId: string): ReactionSummary[] {
  const byEmoji = new Map<string, ReactionSummary>();
  for (const row of rows ?? []) {
    const name = row.profiles?.nickname || row.profiles?.username;
    const existing = byEmoji.get(row.emoji);
    if (existing) {
      existing.count += 1;
      if (row.user_id === userId) existing.reactedByMe = true;
      if (!existing.sampleName && name) existing.sampleName = name;
    } else {
      byEmoji.set(row.emoji, { emoji: row.emoji, count: 1, reactedByMe: row.user_id === userId, sampleName: name });
    }
  }
  return Array.from(byEmoji.values());
}

// Eine Seite des Redaktions-Feeds (neueste zuerst). `before` = created_at des letzten bereits geladenen Beitrags.
export async function fetchRedaktionPage(
  filters: RedaktionFilters,
  before?: string,
  opts: { authorId?: string; limit?: number } = {},
): Promise<RedaktionFeedPost[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("redaktion_posts")
    .select(
      "*, author:author_id(id, username, nickname, avatar_url), story_post:story_post_id(id, title), poll_options:redaktion_poll_options(id, label, position, character:character_id(id, name, avatar_url), votes:redaktion_poll_votes(voter_id, voter:voter_id(id, username, nickname))), comments:redaktion_comments(count), reactions:redaktion_reactions(emoji, user_id, profiles:user_id(username, nickname))",
    )
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "redaktion_poll_options" })
    .limit(opts.limit ?? REDAKTION_PAGE_SIZE);

  if (opts.authorId) query = query.eq("author_id", opts.authorId);
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
  return (data ?? []).map(({ poll_options, comments, reactions, ...post }) => {
    const options = poll_options ?? [];
    const myVoteOptionIds = options.filter((o) => o.votes.some((v) => v.voter_id === user.id)).map((o) => o.id);
    const closed = Boolean(post.poll_closes_at && new Date(post.poll_closes_at) < new Date());
    // Ergebnisse sind für andere erst nach der eigenen Stimme (oder bei geschlossener Umfrage) sichtbar.
    const showResults = post.author_id === user.id || myVoteOptionIds.length > 0 || closed;
    return {
      ...post,
      pollOptionCount: options.length,
      commentCount: comments?.[0]?.count ?? 0,
      poll: options.length
        ? {
            options: options.map(
              (o): FeedPollOption => ({
                id: o.id,
                label: o.label,
                character: o.character,
                voteCount: o.votes.length,
                voters: o.votes.map((v) => v.voter).filter((v): v is NonNullable<typeof v> => Boolean(v)),
              }),
            ),
            myVoteOptionIds,
            showResults,
            closed,
          }
        : null,
      reactions: summarizeReactions(reactions, user.id),
    };
  });
}
