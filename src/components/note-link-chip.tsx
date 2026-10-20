import Link from "next/link";
import { BookOpen, Bookmark, Clapperboard, StickyNote, User, type LucideIcon } from "lucide-react";
import type { LinkKind, NoteLinkView } from "@/lib/notes";

export const KIND_ICON: Record<LinkKind, LucideIcon> = {
  character: User,
  wiki: BookOpen,
  scene: Clapperboard,
  clip: Bookmark,
  note: StickyNote,
};

// Kleine Marke für ein verknüpftes Ziel. Ohne Adresse (gelöscht oder nicht mehr sichtbar) wird sie durchgestrichen.
export function NoteLinkChip({ link, children, className = "" }: { link: Pick<NoteLinkView, "kind" | "label" | "href" | "missing">; children?: React.ReactNode; className?: string }) {
  const Icon = KIND_ICON[link.kind];
  const base = `inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-2.5 text-xs text-fg-soft ${children ? "pr-1" : "pr-2.5"} ${className}`;
  const body = (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} />
      <span className={`truncate ${link.missing ? "line-through opacity-60" : ""}`}>{link.label}</span>
    </>
  );
  return (
    <span className={base}>
      {link.href ? (
        <Link href={link.href} className="inline-flex min-w-0 items-center gap-1.5 hover:text-fg">
          {body}
        </Link>
      ) : (
        <span className="inline-flex min-w-0 items-center gap-1.5">{body}</span>
      )}
      {children}
    </span>
  );
}
