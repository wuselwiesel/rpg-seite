"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bookmark, BookOpen, Lock, Pin, Archive, EyeOff, ShieldAlert } from "lucide-react";
import { toggleStoryPostFlag, toggleStoryBookmark } from "../actions";

export function StoryPostControls({
  storyPostId,
  isPrivate,
  spoiler,
  pinned,
  locked,
  archived,
  isWorldOwner,
  isAuthor,
  initialBookmarked,
}: {
  storyPostId: string;
  isPrivate: boolean;
  spoiler: boolean;
  pinned: boolean;
  locked: boolean;
  archived: boolean;
  isWorldOwner: boolean;
  isAuthor: boolean;
  initialBookmarked: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPinned, setIsPinned] = useState(pinned);
  const [isLocked, setIsLocked] = useState(locked);
  const [isArchived, setIsArchived] = useState(archived);
  const [isSpoiler, setIsSpoiler] = useState(spoiler);
  const [, startTransition] = useTransition();
  const rowRef = useRef<HTMLDivElement>(null);

  // Am Handy blendet ein Tipp auf die Karte die Symbole ein (Kartenelement trägt `group/scene`), ein Tipp daneben wieder aus.
  useEffect(() => {
    const card = rowRef.current?.closest("article");
    if (!card) return;
    const toggle = (e: MouseEvent) => {
      if (!window.matchMedia("(hover: none)").matches) return;
      if ((e.target as HTMLElement).closest("a, button, input, textarea, select")) return;
      if (card.hasAttribute("data-tapped")) card.removeAttribute("data-tapped");
      else card.setAttribute("data-tapped", "");
    };
    const outside = (e: PointerEvent) => {
      if (!card.contains(e.target as Node)) card.removeAttribute("data-tapped");
    };
    card.addEventListener("click", toggle);
    document.addEventListener("pointerdown", outside);
    return () => {
      card.removeEventListener("click", toggle);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);

  function handleBookmark() {
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const result = await toggleStoryBookmark(storyPostId);
      if (result.error) {
        setBookmarked(!next);
        alert(result.error);
      }
    });
  }

  function handleFlag(flag: "pinned" | "locked" | "archived" | "is_spoiler", value: boolean) {
    const setters = { pinned: setIsPinned, locked: setIsLocked, archived: setIsArchived, is_spoiler: setIsSpoiler };
    setters[flag](value);
    startTransition(async () => {
      const error = await toggleStoryPostFlag(storyPostId, flag, value);
      if (error) {
        setters[flag](!value);
        alert(error);
      }
    });
  }

  return (
    <div ref={rowRef} className="mb-2 flex flex-wrap items-center gap-2" data-tour="scene-controls">
      {isPrivate && (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-fg-soft">
          <EyeOff className="h-3 w-3" strokeWidth={2} />
          Geheim
        </span>
      )}
      {isSpoiler && (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-fg-soft">
          <ShieldAlert className="h-3 w-3" strokeWidth={2} />
          Spoiler
        </span>
      )}
      {isPinned && (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-strong/15 px-2.5 py-0.5 text-xs font-medium text-accent">
          <Pin className="h-3 w-3" strokeWidth={2} />
          Angepinnt
        </span>
      )}
      {isLocked && (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-fg-soft">
          <Lock className="h-3 w-3" strokeWidth={2} />
          Abgeschlossen
        </span>
      )}
      {isArchived && (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-fg-soft">
          <Archive className="h-3 w-3" strokeWidth={2} />
          Archiviert
        </span>
      )}

      <div className="ml-auto flex items-center gap-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/scene:opacity-100 [@media(hover:hover)]:focus-within:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0 [@media(hover:none)]:group-data-[tapped]/scene:pointer-events-auto [@media(hover:none)]:group-data-[tapped]/scene:opacity-100">
        <Link
          href={`/story/${storyPostId}/buch`}
          title="Als Buch ansehen, als PDF oder E-Book speichern"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <BookOpen className="h-4 w-4" strokeWidth={2} />
        </Link>
        <button
          type="button"
          onClick={handleBookmark}
          title={bookmarked ? "Lesezeichen entfernen" : "Lesezeichen setzen"}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2 ${
            bookmarked ? "text-accent" : "text-muted hover:text-fg"
          }`}
        >
          <Bookmark className="h-4 w-4" strokeWidth={2} fill={bookmarked ? "currentColor" : "none"} />
        </button>

        {isWorldOwner && (
          <button
            type="button"
            onClick={() => handleFlag("pinned", !isPinned)}
            title={isPinned ? "Nicht mehr anpinnen" : "Anpinnen"}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2 ${
              isPinned ? "text-accent" : "text-muted hover:text-fg"
            }`}
          >
            <Pin className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
        {(isWorldOwner || isAuthor) && (
          <button
            type="button"
            onClick={() => handleFlag("is_spoiler", !isSpoiler)}
            title={isSpoiler ? "Spoiler-Marke entfernen" : "Als Spoiler markieren"}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2 ${
              isSpoiler ? "text-accent" : "text-muted hover:text-fg"
            }`}
          >
            <ShieldAlert className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
        {(isWorldOwner || isAuthor) && (
          <button
            type="button"
            onClick={() => handleFlag("locked", !isLocked)}
            title={isLocked ? "Fortsetzen" : "Abschließen"}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2 ${
              isLocked ? "text-accent" : "text-muted hover:text-fg"
            }`}
          >
            <Lock className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
        {isWorldOwner && (
          <button
            type="button"
            onClick={() => handleFlag("archived", !isArchived)}
            title={isArchived ? "Aus Archiv holen" : "Archivieren"}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2 ${
              isArchived ? "text-accent" : "text-muted hover:text-fg"
            }`}
          >
            <Archive className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
