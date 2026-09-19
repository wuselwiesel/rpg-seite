import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { firstImageSrc, stripHtml } from "@/lib/strip-html";

export function SocialPostCard({
  title,
  content,
  createdAt,
  character,
  characterHref,
  detailHref,
  replyCount,
  worldName,
  reactionBar,
  tags,
  tagHrefBase,
}: {
  title: string;
  content: string;
  createdAt: string;
  character: Character | null;
  characterHref: string;
  detailHref: string;
  replyCount: number;
  worldName?: string;
  reactionBar?: React.ReactNode;
  tags?: string[];
  tagHrefBase?: string;
}) {
  const preview = stripHtml(content);
  const image = firstImageSrc(content);
  const handle = character?.username ?? character?.name ?? "Unbekannt";

  return (
    <article className="border-b border-line pb-4">
      <Link href={characterHref} className="flex items-center gap-3 px-1 py-3">
        <div className="rounded-full bg-gradient-to-tr from-accent to-accent-strong p-[2px]">
          <div className="rounded-full bg-app p-[2px]">
            <CharacterAvatar name={character?.name ?? "?"} avatarUrl={character?.avatar_url} size={32} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{handle}</p>
          {worldName && <p className="truncate text-xs text-muted">in {worldName}</p>}
        </div>
      </Link>

      <Link href={detailHref} className="block">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={title || "Beitragsbild"} className="max-h-[590px] w-full rounded-sm bg-surface-2 object-cover" />
        ) : (
          <div className="flex aspect-square flex-col justify-center gap-3 rounded-sm bg-surface-3 p-8">
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
      </Link>

      <div className="flex items-center gap-4 px-1 pt-3">
        {reactionBar}
        <Link href={detailHref} aria-label="Kommentieren" className="text-fg transition hover:text-muted">
          <MessageCircle className="h-6 w-6" strokeWidth={1.75} />
        </Link>
      </div>

      {image && (
        <p className="mt-2 px-1 text-sm text-fg">
          <Link href={characterHref} className="font-semibold">{handle}</Link>{" "}
          {title && <span className="font-serif text-base">{title} </span>}
          {preview && <span className="text-fg-soft">{preview.length > 140 ? `${preview.slice(0, 137)}...` : preview}</span>}
        </p>
      )}

      {tags && tags.length > 0 && tagHrefBase && (
        <p className="mt-1 flex flex-wrap gap-x-2 px-1 text-sm">
          {tags.map((tag) => (
            <Link key={tag} href={`${tagHrefBase}?tag=${encodeURIComponent(tag)}`} className="text-accent hover:underline">
              #{tag}
            </Link>
          ))}
        </p>
      )}

      {replyCount > 0 && (
        <Link href={detailHref} className="mt-1 block px-1 text-sm text-muted hover:text-fg-soft">
          Alle {replyCount} {replyCount === 1 ? "Kommentar" : "Kommentare"} ansehen
        </Link>
      )}
      <p className="mt-1 px-1 text-[11px] uppercase tracking-wide text-muted">{formatDateTime(createdAt)}</p>
    </article>
  );
}
