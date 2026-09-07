"use client";

import { useState, useTransition } from "react";
import { Bookmark, Lock, Pin, Archive, EyeOff } from "lucide-react";
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
    startTransition(async () => {
      const error = await toggleStoryPostFlag(storyPostId, flag, value);
      if (error) alert(error);
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
      {pinned && (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-strong/15 px-2.5 py-0.5 text-xs font-medium text-accent">
          <Pin className="h-3 w-3" strokeWidth={2} />
          Angepinnt
        </span>
      )}
      {locked && (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-fg-soft">
          <Lock className="h-3 w-3" strokeWidth={2} />
          Gesperrt
        </span>
      )}
      {archived && (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-fg-soft">
          <Archive className="h-3 w-3" strokeWidth={2} />
          Archiviert
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
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
              onClick={() => handleFlag("pinned", !pinned)}
              title={pinned ? "Nicht mehr anpinnen" : "Anpinnen"}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2 ${
                pinned ? "text-accent" : "text-muted hover:text-fg"
              }`}
            >
              <Pin className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => handleFlag("locked", !locked)}
              title={locked ? "Entsperren" : "Sperren"}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2 ${
                locked ? "text-accent" : "text-muted hover:text-fg"
              }`}
            >
              <Lock className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => handleFlag("archived", !archived)}
              title={archived ? "Aus Archiv holen" : "Archivieren"}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2 ${
                archived ? "text-accent" : "text-muted hover:text-fg"
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
