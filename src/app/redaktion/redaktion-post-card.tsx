"use client";

import { NameBadge } from "@/components/name-badge";
import { EmojiHtml } from "@/components/custom-emoji-provider";
import Link from "next/link";
import { useState } from "react";
import { BarChart3, BookOpen, ChevronDown, MessageCircle, Trash2 } from "lucide-react";
import { deleteRedaktionPost } from "./actions";
import { CharacterAvatar } from "@/components/character-avatar";
import { PostMedia } from "@/components/post-media";
import { MediaCarousel } from "@/components/media-carousel";
import { autolinkHtml } from "@/lib/autolink";
import { stripHtml } from "@/lib/strip-html";
import { timeAgoShort } from "@/lib/format";
import { RedaktionReactionBar } from "./redaktion-reaction-bar";
import { RedaktionPoll } from "./[id]/redaktion-poll";
import type { RedaktionFeedPost } from "@/lib/redaktion-feed-types";

// Gleicher Aufbau wie die Ingame-Beitragskarte (Kopfzeile mit Avatar-Ring, Medien randlos, Aktionsleiste,
// Bildunterschrift, Kommentar-Link). Reine Text-Beiträge bleiben einfacher Text (wie bei Threads/Reddit).
export function RedaktionPostCard({
  post,
  isOwn,
  priority = false,
}: {
  post: RedaktionFeedPost;
  isOwn: boolean;
  priority?: boolean;
}) {
  const [removed, setRemoved] = useState(false);
  // Umfragen sind im Feed direkt sichtbar und lassen sich bei Bedarf einklappen.
  const [pollOpen, setPollOpen] = useState(true);
  const commentCount = post.commentCount;
  const [error, setError] = useState<string | null>(null);
  if (removed) return null;

  const detailHref = `/redaktion/${post.id}`;
  const profileHref = `/redaktion/profil/${post.author_id}`;
  const preview = stripHtml(post.content);
  const contentHtml = autolinkHtml(post.content, { tagHref: "/redaktion" });
  const authorName = post.author?.nickname || post.author?.username || "Unbekannt";
  const handle = post.author?.username ?? authorName;
  const gallery = post.media_urls && post.media_urls.length > 1 ? post.media_urls : null;
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
    <article className="-mx-3 border-b border-line pb-4 sm:mx-0">
      <div className="flex items-center gap-2.5 px-3 py-2 sm:px-1">
        <Link href={profileHref} className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="shrink-0 rounded-full bg-gradient-to-tr from-accent to-accent-strong p-[2px]">
            <div className="rounded-full bg-app p-[2px]">
              <CharacterAvatar name={authorName} avatarUrl={post.author?.avatar_url} size={30} />
            </div>
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex items-baseline gap-1.5 text-[13px] text-fg">
              <span className="truncate font-semibold">{handle}</span>
              <NameBadge userId={post.author_id} />
              <time
                dateTime={post.created_at}
                title={new Date(post.created_at).toLocaleString("de-DE")}
                className="shrink-0 text-xs font-normal text-muted"
              >
                {timeAgoShort(post.created_at)}
              </time>
            </p>
            {post.author?.nickname && <p className="truncate text-xs text-muted">{post.author.nickname}</p>}
          </div>
        </Link>
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
          className="mx-3 mb-2 flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-fg-soft transition hover:bg-surface-3 hover:text-fg sm:mx-1"
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="truncate">Aus der Story: {post.story_post.title}</span>
        </Link>
      )}

      {gallery ? (
        <MediaCarousel urls={gallery} alt="" className="sm:overflow-hidden sm:rounded-sm" />
      ) : post.media_url && post.media_type === "video" ? (
        <PostMedia url={post.media_url} type="video" alt="" className="max-h-[590px] w-full bg-black sm:rounded-sm" />
      ) : post.media_url && post.media_type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.media_url}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          draggable={false}
          className="max-h-[590px] w-full bg-surface-2 object-cover sm:rounded-sm"
        />
      ) : null}

      {!hasMedia && preview && (
        <EmojiHtml className="post-content px-3 pt-1 text-[15px] text-fg [&_p]:my-1.5 sm:px-1" html={contentHtml} />
      )}
      {!hasMedia && preview.length > 320 && (
        <Link href={detailHref} className="mt-1 block px-3 text-sm font-medium text-fg-soft hover:text-fg sm:px-1">
          Weiterlesen
        </Link>
      )}

      {post.poll && (
        <div className="mx-3 mt-3 sm:mx-1">
          <button
            type="button"
            onClick={() => setPollOpen((v) => !v)}
            aria-expanded={pollOpen}
            className="mb-2 flex w-full items-center justify-between text-sm font-medium text-fg"
          >
            <span className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" strokeWidth={2} />
              Umfrage
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted transition-transform ${pollOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>
          {pollOpen && (
            <RedaktionPoll
              postId={post.id}
              options={post.poll.options}
              multiSelect={post.poll_multi_select}
              showVoterNames={post.poll_show_voters}
              myVoteOptionIds={post.poll.myVoteOptionIds}
              showResults={post.poll.showResults}
              closed={post.poll.closed}
              closesAt={post.poll_closes_at}
            />
          )}
        </div>
      )}

      <div className="px-3 pt-3 sm:px-1">
        <RedaktionReactionBar
          postId={post.id}
          initialReactions={post.reactions}
          commentSlot={
            <Link href={detailHref} aria-label="Kommentieren" className="text-fg transition duration-150 hover:text-muted active:scale-75">
              <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
            </Link>
          }
        />
      </div>

      {hasMedia && preview && (
        <p className="mt-2 px-3 text-sm text-fg sm:px-1">
          <Link href={profileHref} className="font-semibold">
            {handle}
          </Link>{" "}
          <span className="text-fg-soft">{preview.length > 140 ? `${preview.slice(0, 137)}...` : preview}</span>
        </p>
      )}

      {post.tags.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-x-2 px-3 text-sm sm:px-1">
          {post.tags.map((tag) => (
            <Link key={tag} href={`/redaktion?tag=${encodeURIComponent(tag)}`} className="text-accent hover:underline">
              #{tag}
            </Link>
          ))}
        </p>
      )}

      {commentCount > 0 && (
        <Link href={detailHref} className="mt-1 block px-3 text-sm text-muted hover:text-fg-soft sm:px-1">
          Alle {commentCount} {commentCount === 1 ? "Kommentar" : "Kommentare"} ansehen
        </Link>
      )}
      {error && <p className="mt-2 px-3 text-xs text-red-600 dark:text-red-400 sm:px-1">{error}</p>}
    </article>
  );
}
