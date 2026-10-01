"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, MessageCircle, Trash2 } from "lucide-react";
import { deleteRedaktionPost } from "./actions";
import { CharacterAvatar } from "@/components/character-avatar";
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

      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image_url}
          alt=""
          className="mb-3 max-h-[420px] w-full rounded-lg bg-surface-2 object-cover"
        />
      )}

      <div
        className="post-content text-[15px] text-fg-soft [&_p]:my-1.5"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
      {!post.image_url && preview.length > 320 && (
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
