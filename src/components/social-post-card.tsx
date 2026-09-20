import Link from "next/link";
import { MessageCircle, Pin, BookOpen } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import { timeAgoShort } from "@/lib/format";
import { firstImageSrc, stripHtml } from "@/lib/strip-html";
import { PostMedia } from "./post-media";
import { MediaCarousel } from "./media-carousel";
import { DoubleTapLike } from "./double-tap-like";
import { ReactionBar } from "./reaction-bar";
import { SharePostButton } from "./share-post-button";
import { CharacterThemed } from "./character-themed";
import type { FeedPost } from "@/lib/feed-types";

// Instagram-artige Beitragskarte. Schrift und Akzent kommen aus dem Profil-Design des Charakters.
export function SocialPostCard({
  post,
  activeCharacterId,
  tagHrefBase,
}: {
  post: FeedPost;
  activeCharacterId: string;
  tagHrefBase?: string;
}) {
  const { title, content, character, tags, storyPost } = post;
  const characterHref = `/characters/${post.characterId}`;
  const detailHref = `/posts/${post.id}`;
  const preview = stripHtml(content);
  const media = post.mediaUrl && post.mediaType ? { url: post.mediaUrl, type: post.mediaType } : null;
  const gallery = post.mediaUrls && post.mediaUrls.length > 1 ? post.mediaUrls : null;
  const image = gallery ? null : media?.type === "image" ? media.url : media ? null : firstImageSrc(content);
  const handle = character?.username ?? character?.name ?? "Unbekannt";

  return (
    <CharacterThemed character={character}>
      <article className="-mx-3 border-b border-line pb-4 sm:mx-0">
        <Link href={characterHref} className="flex items-center gap-3 px-3 py-3 sm:px-1">
          <div className="rounded-full bg-gradient-to-tr from-accent to-accent-strong p-[2px]">
            <div className="rounded-full bg-app p-[2px]">
              <CharacterAvatar name={character?.name ?? "?"} avatarUrl={character?.avatar_url} size={32} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">{handle}</p>
            {post.worldName && <p className="truncate text-xs text-muted">in {post.worldName}</p>}
          </div>
          {post.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} aria-label="Angepinnt" />}
          <time
            dateTime={post.createdAt}
            title={new Date(post.createdAt).toLocaleString("de-DE")}
            className="shrink-0 text-xs text-muted"
          >
            {timeAgoShort(post.createdAt)}
          </time>
        </Link>

        {storyPost && (
          <Link
            href={`/story/${storyPost.id}`}
            className="mx-3 mb-2 flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-fg-soft transition hover:bg-surface-3 hover:text-fg sm:mx-1"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">Aus der Story: {storyPost.title}</span>
          </Link>
        )}

        <DoubleTapLike likeKey={post.id}>
          {gallery ? (
            <MediaCarousel urls={gallery} alt={title || "Beitragsbild"} className="sm:overflow-hidden sm:rounded-sm" />
          ) : media?.type === "video" ? (
            <PostMedia url={media.url} type="video" alt="" className="max-h-[590px] w-full bg-black sm:rounded-sm" />
          ) : image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={title || "Beitragsbild"}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="max-h-[590px] w-full bg-surface-2 object-cover sm:rounded-sm"
            />
          ) : (
            <div className="flex aspect-square flex-col justify-center gap-3 bg-[var(--tile-bg,var(--surface-3))] p-8 text-[var(--tile-fg,var(--fg))] sm:rounded-sm">
              {title && <h2 className="font-serif text-3xl leading-tight">{title}</h2>}
              {preview && (
                <p
                  className={
                    title
                      ? "line-clamp-6 text-[15px] leading-relaxed opacity-90"
                      : "line-clamp-[10] font-serif text-2xl leading-snug"
                  }
                >
                  {preview}
                </p>
              )}
            </div>
          )}
        </DoubleTapLike>

        <div className="px-3 pt-3 sm:px-1">
          <ReactionBar
            heart
            target={{ postId: post.id }}
            initialReactions={post.reactions}
            commentSlot={
              <>
                <Link href={detailHref} aria-label="Kommentieren" className="text-fg transition hover:text-muted">
                  <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
                </Link>
                <SharePostButton postId={post.id} characterId={activeCharacterId} />
              </>
            }
          />
        </div>

        {!image && !media && !gallery && preview.length > 260 && (
          <Link href={detailHref} className="mt-2 block px-3 text-sm font-medium text-fg-soft hover:text-fg sm:px-1">
            Weiterlesen
          </Link>
        )}

        {(image || media || gallery) && (
          <p className="mt-2 px-3 text-sm text-fg sm:px-1">
            <Link href={characterHref} className="font-semibold">{handle}</Link>{" "}
            {title && <span className="font-serif text-base">{title} </span>}
            {preview && <span className="text-fg-soft">{preview.length > 140 ? `${preview.slice(0, 137)}...` : preview}</span>}
          </p>
        )}

        {tags.length > 0 && tagHrefBase && (
          <p className="mt-1 flex flex-wrap gap-x-2 px-3 text-sm sm:px-1">
            {tags.map((tag) => (
              <Link key={tag} href={`${tagHrefBase}?tag=${encodeURIComponent(tag)}`} className="text-accent hover:underline">
                #{tag}
              </Link>
            ))}
          </p>
        )}

        {post.replyCount > 0 && (
          <Link href={detailHref} className="mt-1 block px-3 text-sm text-muted hover:text-fg-soft sm:px-1">
            Alle {post.replyCount} {post.replyCount === 1 ? "Kommentar" : "Kommentare"} ansehen
          </Link>
        )}
      </article>
    </CharacterThemed>
  );
}
