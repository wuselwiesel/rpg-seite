import Link from "next/link";
import { Clock, EyeOff, MapPin, MessageCircle, Pen, Pin } from "lucide-react";
import { RecapToggle } from "./recap-toggle";
import { CharacterAvatar } from "./character-avatar";
import { NarratorAvatar } from "./narrator-avatar";
import type { Character } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { stripHtml } from "@/lib/strip-html";

export function EntryCard({
  id,
  title,
  content,
  createdAt,
  character,
  characterHref,
  detailHref,
  replyCount,
  replyLabel = "Kommentare",
  replyCta = "Kommentieren",
  index = 0,
  worldName,
  likeButton,
  tags,
  tagHrefBase,
  arcName,
  arcHref,
  isPrivate,
  recapHtml = "",
  pinned,
  location,
  inWorldTime,
  locationHrefBase,
  yourTurn,
  narrator = false,
}: {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  character: Character | null;
  characterHref: string;
  detailHref: string;
  replyCount: number;
  replyLabel?: string;
  replyCta?: string;
  index?: number;
  worldName?: string;
  likeButton?: React.ReactNode;
  tags?: string[];
  tagHrefBase?: string;
  arcName?: string;
  arcHref?: string;
  isPrivate?: boolean;
  // Selbst geschriebene Zusammenfassung der Szene (bereinigtes HTML), klappt in der Karte auf
  recapHtml?: string;
  pinned?: boolean;
  location?: string | null;
  inWorldTime?: string | null;
  locationHrefBase?: string;
  yourTurn?: boolean;
  // Erzähler:in-Beitrag: neutral, ohne Charakter.
  narrator?: boolean;
}) {
  const preview = stripHtml(content);
  // Ruhige Rangordnung statt wechselnder Pastellflächen: weiß mit feiner Linie; Erzähler:in-Beiträge leicht getönt,
  // „Du bist dran“ mit kräftigem Rand links, Angepinntes mit Akzentlinie oben.
  void index;
  const surface = narrator ? "border-line bg-surface-2" : "border-line bg-surface";
  const emphasis = yourTurn ? "border-l-[4px] border-l-accent-strong" : pinned ? "border-t-[3px] border-t-accent" : "";

  return (
    <article key={id} className={`rounded-2xl border p-5 transition-shadow hover:shadow-[0_6px_24px_-12px_rgba(60,40,50,0.25)] ${surface} ${emphasis}`}>
      {narrator ? (
        <div className="mb-3 flex w-fit items-center gap-3">
          <NarratorAvatar size={36} />
          <div>
            <p className="text-sm font-medium text-fg">Erzähler:in</p>
            <p className="text-xs text-muted">
              {formatDateTime(createdAt)}
              {worldName && <span> · in {worldName}</span>}
            </p>
          </div>
        </div>
      ) : (
      <Link href={characterHref} className="mb-3 flex w-fit items-center gap-3">
          <CharacterAvatar name={character?.name ?? "?"} avatarUrl={character?.avatar_url} size={36} />
          <div>
            <p className="text-sm font-medium text-fg hover:text-accent">
              {character?.name ?? "Unbekannt"}
            </p>
            <p className="text-xs text-muted">
              {formatDateTime(createdAt)}
              {worldName && <span> · in {worldName}</span>}
            </p>
          </div>
        </Link>
      )}
      {arcName && arcHref && (
        <Link
          href={arcHref}
          className="mb-2 inline-flex w-fit items-center rounded-full bg-accent-strong/15 px-2.5 py-0.5 text-xs font-medium text-accent transition hover:bg-accent-strong/25"
        >
          {arcName}
        </Link>
      )}
      {(location || inWorldTime || yourTurn) && (
        <div className="mb-2 flex flex-wrap gap-1.5 text-xs text-fg-soft">
          {yourTurn && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-strong px-2.5 py-0.5 font-medium text-on-accent-strong">
              <Pen className="h-3 w-3" strokeWidth={2} />
              Du bist dran
            </span>
          )}
          {location &&
            (locationHrefBase ? (
              <Link
                href={`${locationHrefBase}?ort=${encodeURIComponent(location)}`}
                className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-0.5 transition hover:text-accent"
              >
                <MapPin className="h-3 w-3" strokeWidth={2} />
                {location}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-0.5">
                <MapPin className="h-3 w-3" strokeWidth={2} />
                {location}
              </span>
            ))}
          {inWorldTime && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-0.5">
              <Clock className="h-3 w-3" strokeWidth={2} />
              {inWorldTime}
            </span>
          )}
        </div>
      )}
      <Link href={detailHref} className="block">
        <h2 className="mb-1.5 flex items-center gap-2 font-serif text-[1.7rem] leading-[1.15] text-fg">
          {pinned && <Pin className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />}
          {isPrivate && <EyeOff className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />}
          {title}
        </h2>
        {preview && <p className="line-clamp-3 text-[15px] leading-relaxed text-fg-soft">{preview}</p>}
      </Link>
      {tags && tags.length > 0 && tagHrefBase && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`${tagHrefBase}?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs text-fg-soft transition hover:text-accent"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center gap-4 border-t border-line pt-3">
        <Link
          href={detailHref}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-fg"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={2} />
          {replyCount > 0 ? `${replyCount} ${replyLabel}` : replyCta}
        </Link>
        {likeButton}
      </div>
      {recapHtml && <RecapToggle html={recapHtml} className="mt-2" />}
    </article>
  );
}
