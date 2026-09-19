import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";
import { timeAgoShort } from "@/lib/format";
import { firstImageSrc, stripHtml } from "@/lib/strip-html";
import { PostMedia } from "./post-media";
import { DoubleTapLike } from "./double-tap-like";
import { ReactionBar } from "./reaction-bar";
import type { ReactionSummary } from "@/lib/reactions";

export function SocialPostCard({
  postId,
  reactions,
  title,
  content,
  createdAt,
  character,
  characterHref,
  detailHref,
  replyCount,
  worldName,
  tags,
  tagHrefBase,
  mediaUrl,
  mediaType,
}: {
  postId: string;
  reactions: ReactionSummary[];
  title: string;
  content: string;
  createdAt: string;
  character: Character | null;
  characterHref: string;
  detailHref: string;
  replyCount: number;
  worldName?: string;
  tags?: string[];
  tagHrefBase?: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
}) {
  const preview = stripHtml(content);
  const media = mediaUrl && mediaType ? { url: mediaUrl, type: mediaType } : null;
  const image = media?.type === "image" ? media.url : media ? null : firstImageSrc(content);
  const handle = character?.username ?? character?.name ?? "Unbekannt";

  return (
    <article className="-mx-3 border-b border-line pb-4 sm:mx-0">
      <Link href={characterHref} className="flex items-center gap-3 px-3 py-3 sm:px-1">
        <div className="rounded-full bg-gradient-to-tr from-accent to-accent-strong p-[2px]">
          <div className="rounded-full bg-app p-[2px]">
            <CharacterAvatar name={character?.name ?? "?"} avatarUrl={character?.avatar_url} size={32} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{handle}</p>
          {worldName && <p className="truncate text-xs text-muted">in {worldName}</p>}
        </div>
        <time dateTime={createdAt} title={new Date(createdAt).toLocaleString("de-DE")} className="shrink-0 text-xs text-muted">
          {timeAgoShort(createdAt)}
        </time>
      </Link>

      <DoubleTapLike postId={postId}>
        {media?.type === "video" ? (
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
          <div className="flex aspect-square flex-col justify-center gap-3 bg-surface-3 p-8 sm:rounded-sm">
            {title && <h2 className="font-serif text-3xl leading-tight text-fg">{title}</h2>}
            {preview && (
              <p
                className={
                  title
                    ? "line-clamp-6 text-[15px] leading-relaxed text-fg-soft"
                    : "line-clamp-[10] font-serif text-2xl leading-snug text-fg"
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
          target={{ postId }}
          initialReactions={reactions}
          commentSlot={
            <Link href={detailHref} aria-label="Kommentieren" className="text-fg transition hover:text-muted">
              <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
            </Link>
          }
        />
      </div>

      {!image && !media && preview.length > 260 && (
        <Link href={detailHref} className="mt-2 block px-3 text-sm font-medium text-fg-soft hover:text-fg sm:px-1">
          Weiterlesen
        </Link>
      )}

      {(image || media) && (
        <p className="mt-2 px-3 text-sm text-fg sm:px-1">
          <Link href={characterHref} className="font-semibold">{handle}</Link>{" "}
          {title && <span className="font-serif text-base">{title} </span>}
          {preview && <span className="text-fg-soft">{preview.length > 140 ? `${preview.slice(0, 137)}...` : preview}</span>}
        </p>
      )}

      {tags && tags.length > 0 && tagHrefBase && (
        <p className="mt-1 flex flex-wrap gap-x-2 px-3 text-sm sm:px-1">
          {tags.map((tag) => (
            <Link key={tag} href={`${tagHrefBase}?tag=${encodeURIComponent(tag)}`} className="text-accent hover:underline">
              #{tag}
            </Link>
          ))}
        </p>
      )}

      {replyCount > 0 && (
        <Link href={detailHref} className="mt-1 block px-3 text-sm text-muted hover:text-fg-soft sm:px-1">
          Alle {replyCount} {replyCount === 1 ? "Kommentar" : "Kommentare"} ansehen
        </Link>
      )}
    </article>
  );
}
