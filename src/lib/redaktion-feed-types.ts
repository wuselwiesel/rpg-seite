import type { RedaktionPost } from "@/lib/types";

export const REDAKTION_PAGE_SIZE = 10;

export type RedaktionFilters = { q?: string; from?: string; to?: string; tag?: string };

// Alles, was eine Redaktions-Karte braucht – serialisierbar, damit weitere Seiten per Server Action nachgeladen werden können.
export type RedaktionFeedPost = Omit<RedaktionPost, "poll_options"> & {
  pollOptionCount: number;
  commentCount: number;
};
