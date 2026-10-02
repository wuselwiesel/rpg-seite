"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, Grid3x3, MessageCircle, Pin, Play, Rows3 } from "lucide-react";
import { RedaktionPostCard } from "../../redaktion-post-card";
import { stripHtml } from "@/lib/strip-html";
import type { RedaktionFeedPost } from "@/lib/redaktion-feed-types";

export type ProfilePost = RedaktionFeedPost;

function Tile({ post, pinned }: { post: ProfilePost; pinned: boolean }) {
  const cover = post.media_urls?.[0] ?? post.media_url;
  const excerpt = stripHtml(post.content).slice(0, 140);

  return (
    <Link
      href={`/redaktion/${post.id}`}
      className="group relative block aspect-square overflow-hidden bg-surface-2"
      aria-label={excerpt || "Beitrag öffnen"}
    >
      {post.media_type === "image" && cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : post.media_type === "video" && cover ? (
        <video src={`${cover}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col justify-between p-2.5 text-left">
          <p className="line-clamp-5 text-[11px] leading-snug text-fg-soft sm:text-sm">
            {excerpt || (post.pollOptionCount > 0 ? "Umfrage" : "")}
          </p>
          {post.pollOptionCount > 0 && <BarChart3 className="h-4 w-4 text-muted" strokeWidth={2} />}
        </div>
      )}
      <span className="absolute right-1.5 top-1.5 flex items-center gap-1 text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.7)]">
        {pinned && <Pin className="h-4 w-4" strokeWidth={2.2} />}
        {post.media_type === "video" && <Play className="h-4 w-4 fill-current" strokeWidth={2} />}
        {post.media_type === "image" && (post.media_urls?.length ?? 0) > 1 && <Grid3x3 className="h-4 w-4" strokeWidth={2} />}
      </span>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 bg-black/40 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100">
        <MessageCircle className="h-4 w-4 fill-current" strokeWidth={2} />
        {post.commentCount}
      </span>
    </Link>
  );
}

export function ProfilePosts({
  posts,
  pinnedIds,
  currentUserId,
}: {
  posts: ProfilePost[];
  pinnedIds: string[];
  currentUserId: string;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");

  const pinnedSet = new Set(pinnedIds);
  const pinned = pinnedIds.map((id) => posts.find((p) => p.id === id)).filter((p): p is ProfilePost => Boolean(p));
  const ordered = [...pinned, ...posts.filter((p) => !pinnedSet.has(p.id))];

  const tab = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 border-t-2 py-2.5 text-xs font-semibold transition ${
      active ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg-soft"
    }`;

  return (
    <div>
      <div className="flex border-t border-line" role="tablist">
        <button type="button" role="tab" aria-selected={view === "grid"} onClick={() => setView("grid")} className={tab(view === "grid")}>
          <Grid3x3 className="h-4 w-4" strokeWidth={2} />
          Raster
        </button>
        <button type="button" role="tab" aria-selected={view === "list"} onClick={() => setView("list")} className={tab(view === "list")}>
          <Rows3 className="h-4 w-4" strokeWidth={2} />
          Liste
        </button>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
          {ordered.map((post) => (
            <Tile key={post.id} post={post} pinned={pinnedSet.has(post.id)} />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2 px-3 sm:px-0">
          {ordered.map((post) => (
            <div key={post.id}>
              {pinnedSet.has(post.id) && (
                <p className="mb-1 flex items-center gap-1 text-xs text-muted">
                  <Pin className="h-3 w-3" strokeWidth={2.2} />
                  Angeheftet
                </p>
              )}
              <RedaktionPostCard
                post={post}
                isOwn={post.author_id === currentUserId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
