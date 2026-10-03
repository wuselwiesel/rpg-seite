import Link from "next/link";
import { MapPin, MessageCircle, NotebookPen, Pin } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import { NarratorAvatar } from "./narrator-avatar";
import { timeAgoShort } from "@/lib/format";
import { stripHtml } from "@/lib/strip-html";
import type { Character } from "@/lib/types";

// Kompakte Zeile für die Story-Liste: Avatar, Titel, eine Zeile Text, Zeit.
export function StoryCompactRow({
  href,
  title,
  content,
  createdAt,
  character,
  replyCount,
  location,
  pinned,
  yourTurn,
  hasRecap = false,
  narrator = false,
}: {
  href: string;
  title: string;
  content: string;
  createdAt: string;
  character: Character | null;
  replyCount: number;
  location?: string | null;
  pinned?: boolean;
  yourTurn?: boolean;
  hasRecap?: boolean;
  narrator?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-1 py-3 transition active:bg-surface-2 hover:bg-surface-2/60">
      {narrator ? (
        <NarratorAvatar size={44} />
      ) : (
        <CharacterAvatar name={character?.name ?? "?"} avatarUrl={character?.avatar_url} size={44} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 flex-1 truncate font-serif text-lg leading-snug text-fg">{title}</p>
          <time dateTime={createdAt} className="shrink-0 text-xs text-muted">
            {timeAgoShort(createdAt)}
          </time>
        </div>
        <p className="truncate text-sm text-muted">{stripHtml(content)}</p>
        <div className="mt-0.5 flex items-center gap-2.5 text-xs text-muted">
          {yourTurn && <span className="rounded-full bg-accent-strong/15 px-2 py-px font-medium text-accent">Du bist dran</span>}
          {hasRecap && (
            <span className="flex shrink-0 items-center gap-1" title="Mit Zusammenfassung">
              <NotebookPen className="h-3 w-3" strokeWidth={2} aria-label="Mit Zusammenfassung" />
            </span>
          )}
          {pinned && <Pin className="h-3 w-3" strokeWidth={2} aria-label="Angepinnt" />}
          {location && (
            <span className="flex min-w-0 items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={2} />
              <span className="truncate">{location}</span>
            </span>
          )}
          {replyCount > 0 && (
            <span className="flex shrink-0 items-center gap-1">
              <MessageCircle className="h-3 w-3" strokeWidth={2} />
              {replyCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
