import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { stripHtml } from "@/lib/strip-html";

const SURFACES = ["bg-surface-2", "bg-surface-3", "bg-surface"];

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
}) {
  const preview = stripHtml(content);
  const surface = SURFACES[index % SURFACES.length];

  return (
    <article key={id} className={`rounded-2xl p-5 ${surface}`}>
      <Link href={characterHref} className="mb-3 flex w-fit items-center gap-3">
        <CharacterAvatar name={character?.name ?? "?"} avatarUrl={character?.avatar_url} size={36} />
        <div>
          <p className="text-sm font-medium text-fg hover:text-accent">
            {character?.name ?? "Unbekannt"}
          </p>
          <p className="text-xs text-muted">{formatDateTime(createdAt)}</p>
        </div>
      </Link>
      <Link href={detailHref} className="block">
        <h2 className="mb-1 font-serif text-2xl text-fg">{title}</h2>
        {preview && <p className="line-clamp-3 text-sm text-fg-soft">{preview}</p>}
      </Link>
      <Link
        href={detailHref}
        className="mt-4 flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <MessageCircle className="h-4 w-4" strokeWidth={2} />
        {replyCount > 0 ? `${replyCount} ${replyLabel}` : replyCta}
      </Link>
    </article>
  );
}
