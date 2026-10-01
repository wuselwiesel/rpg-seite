"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, BookOpen, MessageCircle, Trash2 } from "lucide-react";
import { deleteRedaktionPost } from "./actions";
import { CharacterAvatar } from "@/components/character-avatar";
import { PostMedia } from "@/components/post-media";
import { MediaCarousel } from "@/components/media-carousel";
import { autolinkHtml } from "@/lib/autolink";
import { stripHtml } from "@/lib/strip-html";
import { timeAgoShort } from "@/lib/format";
import type { RedaktionPost } from "@/lib/types";

export function RedaktionPostCard({
  post,
  isOwn,
  pollOptionCount,
  commentCount,
}: {
  post: Omit<RedaktionPost, "poll_options">;
  isOwn: boolean;
  pollOptionCount: number;
  commentCount: number;
}) {
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (removed) return null;

  const detailHref = `/redaktion/${post.id}`;
  const preview = stripHtml(post.content);
  const contentHtml = autolinkHtml(post.content, { tagHref: "/redaktion" });
  const authorName = post.author?.nickname || post.author?.username || "Unbekannt";
  const hasMedia = Boolean(post.media_type);

  async function handleDelete() {
    if (!confirm("Diesen Beitrag wirklich löschen?")) return;
    setRemoved(true);
    const err = await deleteRedaktionPost(post.id);
    if (err) {
      setRemoved(false);
      setError(err);
    }
  }

  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <CharacterAvatar name={authorName} avatarUrl={post.author?.avatar_url} size={34} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-fg">{authorName}</p>
          <time dateTime={post.created_at} className="text-xs text-muted">
            {timeAgoShort(post.created_at)}
          </time>
        </div>
        {isOwn && (
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Beitrag löschen"
            className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {post.story_post && (
        <Link
          href={`/story/${post.story_post.id}`}
          className="mb-3 flex w-fit max-w-full items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-fg-soft transition hover:bg-surface-3 hover:text-fg"
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="truncate">Aus der Story: {post.story_post.title}</span>
        </Link>
      )}

      {post.media_urls && post.media_urls.length > 1 ? (
        <MediaCarousel urls={post.media_urls} alt="" className="mb-3 overflow-hidden rounded-lg" />
      ) : (
        post.media_url &&
        post.media_type && (
          <PostMedia
            url={post.media_url}
            type={post.media_type}
            alt=""
            className="mb-3 max-h-[420px] w-full rounded-lg bg-black object-contain"
          />
        )
      )}

      {/* Reiner Text-Beitrag rendert als einfacher Text (wie bei Reddit/Threads) - keine Bild-Kachel. */}
      <div
        className="post-content text-[15px] text-fg-soft [&_p]:my-1.5"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
      {!hasMedia && preview.length > 320 && (
        <Link href={detailHref} className="mt-1 block text-sm font-medium text-fg-soft hover:text-fg">
          Weiterlesen
        </Link>
      )}

      <div className="mt-3 flex items-center gap-4 text-sm text-fg-soft">
        {pollOptionCount > 0 && (
          <Link href={detailHref} className="flex items-center gap-1.5 hover:text-fg">
            <BarChart3 className="h-4 w-4" strokeWidth={2} />
            Umfrage
          </Link>
        )}
        <Link href={detailHref} className="flex items-center gap-1.5 hover:text-fg">
          <MessageCircle className="h-4 w-4" strokeWidth={2} />
          {commentCount > 0 ? commentCount : "Kommentieren"}
        </Link>
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </article>
  );
}
