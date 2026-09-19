import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { stripHtml } from "@/lib/strip-html";

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

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Link href={characterHref} className="flex items-center gap-3 px-4 pt-4">
        <CharacterAvatar name={character?.name ?? "?"} avatarUrl={character?.avatar_url} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg hover:text-accent">
            {character?.name ?? "Unbekannt"}
          </p>
          <p className="text-xs text-muted">
            {formatDateTime(createdAt)}
            {worldName && <span> · in {worldName}</span>}
          </p>
        </div>
      </Link>

      <Link href={detailHref} className="mt-3 block px-4">
        <h2 className="font-serif text-2xl leading-snug text-fg">{title}</h2>
        {preview && <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-fg-soft">{preview}</p>}
      </Link>

      {tags && tags.length > 0 && tagHrefBase && (
        <div className="mt-2 flex flex-wrap gap-1.5 px-4">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`${tagHrefBase}?tag=${encodeURIComponent(tag)}`}
              className="text-xs text-accent hover:underline"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 border-t border-line px-4 py-3">
        {reactionBar}
        <Link href={detailHref} className="flex items-center gap-1.5 text-sm text-muted hover:text-fg">
          <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2} />
          {replyCount > 0 ? replyCount : "Kommentieren"}
        </Link>
      </div>
    </article>
  );
}
