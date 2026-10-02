import type { RedaktionPost } from "@/lib/types";
import type { ReactionSummary } from "@/lib/reactions";

export const REDAKTION_PAGE_SIZE = 10;

export type RedaktionFilters = { q?: string; from?: string; to?: string; tag?: string };

export type FeedPollOption = {
  id: string;
  label: string;
  character: { id: string; name: string; avatar_url: string | null } | null;
  voteCount: number;
  voters: { id: string; username: string; nickname: string | null }[];
};

export type FeedPoll = {
  options: FeedPollOption[];
  myVoteOptionIds: string[];
  showResults: boolean;
  closed: boolean;
};

// Alles, was eine Redaktions-Karte braucht – serialisierbar, damit weitere Seiten per Server Action nachgeladen werden können.
export type RedaktionFeedPost = Omit<RedaktionPost, "poll_options"> & {
  pollOptionCount: number;
  commentCount: number;
  poll: FeedPoll | null;
  reactions: ReactionSummary[];
};
