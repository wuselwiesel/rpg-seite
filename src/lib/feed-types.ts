import type { Character } from "@/lib/types";
import type { ReactionSummary } from "@/lib/reactions";

export const FEED_PAGE_SIZE = 10;

export type FeedFilters = { q?: string; from?: string; to?: string; tag?: string };

// Alles, was eine Feed-Karte braucht – serialisierbar, damit weitere Seiten per Server Action nachgeladen werden können.
export type FeedPost = {
  id: string;
  characterId: string;
  character: Character | null;
  title: string;
  content: string;
  createdAt: string;
  replyCount: number;
  worldName?: string;
  reactions: ReactionSummary[];
  tags: string[];
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  mediaUrls: string[] | null;
  storyPost: { id: string; title: string } | null;
  pinned: boolean;
  tagged: { id: string; name: string; username: string | null }[];
  bonusLikes: number;
};
