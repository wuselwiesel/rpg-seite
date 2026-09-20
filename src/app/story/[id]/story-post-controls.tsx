"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bookmark, BookOpen, Lock, Pin, Archive, EyeOff } from "lucide-react";
import { toggleStoryPostFlag, toggleStoryBookmark } from "../actions";

export function StoryPostControls({
  storyPostId,
  isPrivate,
  pinned,
  locked,
  archived,
  isWorldOwner,
  initialBookmarked,
}: {
  storyPostId: string;
  isPrivate: boolean;
  pinned: boolean;
  locked: boolean;
  archived: boolean;
  isWorldOwner: boolean;
  initialBookmarked: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPinned, setIsPinned] = useState(pinned);
  const [isLocked, setIsLocked] = useState(locked);
  const [isArchived, setIsArchived] = useState(archived);
  const [, startTransition] = useTransition();

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

  function handleFlag(flag: "pinned" | "locked" | "archived", value: boolean) {
    const setters = { pinned: setIsPinned, locked: setIsLocked, archived: setIsArchived };
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
    <div className="mb-2 flex flex-wrap items-center gap-2">
      {isPrivate && (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-fg-soft">
          <EyeOff className="h-3 w-3" strokeWidth={2} />
          Geheim
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
          Gesperrt
        </span>
      )}
      {isArchived && (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-fg-soft">
          <Archive className="h-3 w-3" strokeWidth={2} />
          Archiviert
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
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
          <>
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
            <button
              type="button"
              onClick={() => handleFlag("locked", !isLocked)}
              title={isLocked ? "Entsperren" : "Sperren"}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2 ${
                isLocked ? "text-accent" : "text-muted hover:text-fg"
              }`}
            >
              <Lock className="h-4 w-4" strokeWidth={2} />
            </button>
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
          </>
        )}
      </div>
    </div>
  );
}
