"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { loadMorePosts } from "@/app/feed-actions";
import { SocialPostCard } from "./social-post-card";
import { FEED_PAGE_SIZE, type FeedFilters, type FeedPost } from "@/lib/feed-types";

// Feed mit unendlichem Scrollen: ein unsichtbarer Marker am Ende lädt die nächste Seite,
// bevor man ihn erreicht (rootMargin), sodass man nie auf "Laden..." wartet.
export function FeedList({
  initialPosts,
  filters,
  activeCharacterId,
  emptyState,
}: {
  initialPosts: FeedPost[];
  filters: FeedFilters;
  activeCharacterId: string;
  emptyState: React.ReactNode;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [done, setDone] = useState(initialPosts.length < FEED_PAGE_SIZE);
  const [pending, startTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  // Nach einem Refresh (Pull-to-Refresh, neue Filter) liefert der Server frische Startdaten.
  const [seenInitial, setSeenInitial] = useState(initialPosts);
  if (seenInitial !== initialPosts) {
    setSeenInitial(initialPosts);
    setPosts(initialPosts);
    setDone(initialPosts.length < FEED_PAGE_SIZE);
  }

  const loadMore = useCallback(() => {
    if (busy.current || done || posts.length === 0) return;
    busy.current = true;
    const last = posts[posts.length - 1].createdAt;
    startTransition(async () => {
      const next = await loadMorePosts(filters, last);
      setPosts((prev) => {
        const known = new Set(prev.map((p) => p.id));
        return [...prev, ...next.filter((p) => !known.has(p.id))];
      });
      if (next.length < FEED_PAGE_SIZE) setDone(true);
      busy.current = false;
    });
  }, [done, filters, posts]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: "900px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (posts.length === 0) return <>{emptyState}</>;

  return (
    <>
      <div className="flex flex-col gap-2">
        {posts.map((post, i) => (
          <div key={post.id} className={i >= initialPosts.length ? "feed-in" : undefined}>
            <SocialPostCard post={post} activeCharacterId={activeCharacterId} tagHrefBase="/" priority={i === 0} />
          </div>
        ))}
      </div>
      <div ref={sentinel} className="h-px" />
      {pending && (
        <div className="flex justify-center py-6" role="status" aria-label="Lädt weitere Beiträge">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
        </div>
      )}
      {done && posts.length >= FEED_PAGE_SIZE && (
        <p className="py-8 text-center text-sm text-muted">Du bist auf dem neuesten Stand.</p>
      )}
    </>
  );
}
