"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import { deleteHighlight, deleteStory } from "@/app/stories/actions";
import { storyBackground, timeAgo } from "@/lib/stories";
import type { Story } from "@/lib/types";

export type StoryGroup = {
  key: string;
  characterId: string;
  characterName: string;
  avatarUrl: string | null;
  // Titel eines Highlights; leer bei normalen Storys.
  label?: string;
  highlightId?: string;
  stories: Story[];
  canManage: boolean;
};

const SLIDE_MS = 5500;
const SEEN_KEY = "seen-stories";
const seenListeners = new Set<() => void>();

function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function markSeen(id: string) {
  try {
    const ids: string[] = JSON.parse(readSeen());
    if (ids.includes(id)) return;
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids.slice(-300), id]));
    seenListeners.forEach((l) => l());
  } catch {
    /* Speicher nicht verfügbar */
  }
}

function useSeenIds(): Set<string> {
  const raw = useSyncExternalStore(
    (cb) => {
      seenListeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        seenListeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    readSeen,
    () => "[]",
  );
  return new Set<string>(JSON.parse(raw));
}

// Klickfläche (mit optionalem Ring), die den Vollbild-Viewer öffnet.
export function StoryLauncher({
  groups,
  startIndex = 0,
  ringWidth,
  className = "",
  children,
  label,
}: {
  groups: StoryGroup[];
  startIndex?: number;
  // Ring im Instagram-Stil (Farbverlauf = ungesehen, grau = gesehen); ohne Angabe kein Ring.
  ringWidth?: number;
  className?: string;
  children: React.ReactNode;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const seen = useSeenIds();
  const group = groups[startIndex];
  const allSeen = group ? group.stories.every((s) => seen.has(s.id)) : true;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} className={className}>
        {ringWidth ? (
          <span
            className={`block rounded-full ${allSeen ? "bg-line" : "bg-gradient-to-tr from-accent to-accent-strong"}`}
            style={{ padding: ringWidth }}
          >
            <span className="block rounded-full bg-app" style={{ padding: Math.max(2, ringWidth - 0.5) }}>
              {children}
            </span>
          </span>
        ) : (
          children
        )}
      </button>
      {open && <StoryViewer groups={groups} startIndex={startIndex} onClose={() => setOpen(false)} />}
    </>
  );
}

function StoryViewer({
  groups: initialGroups,
  startIndex,
  onClose,
}: {
  groups: StoryGroup[];
  startIndex: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const holdRef = useRef<number | null>(null);

  const group = groups[gi];
  const story = group?.stories[si];

  const next = useCallback(() => {
    setProgress(0);
    if (!group) return onClose();
    if (si < group.stories.length - 1) setSi(si + 1);
    else if (gi < groups.length - 1) {
      setGi(gi + 1);
      setSi(0);
    } else onClose();
  }, [group, gi, si, groups.length, onClose]);

  const prev = useCallback(() => {
    setProgress(0);
    if (si > 0) setSi(si - 1);
    else if (gi > 0) {
      setGi(gi - 1);
      setSi(groups[gi - 1].stories.length - 1);
    }
  }, [gi, si, groups]);

  useEffect(() => {
    if (story) markSeen(story.id);
  }, [story]);

  useEffect(() => {
    if (paused || !story) return;
    const started = Date.now() - progress * SLIDE_MS;
    const timer = setInterval(() => {
      const p = (Date.now() - started) / SLIDE_MS;
      if (p >= 1) next();
      else setProgress(p);
    }, 50);
    return () => clearInterval(timer);
    // progress bewusst nicht als Abhängigkeit: Start-Offset nur beim (Wieder-)Starten lesen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, story, next]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [next, prev, onClose]);

  async function handleDelete() {
    if (!group || !story) return;
    setPaused(true);
    const isHighlight = Boolean(group.highlightId);
    if (!confirm(isHighlight ? "Dieses Highlight löschen? Die Storys selbst bleiben erhalten." : "Diese Story wirklich löschen?")) {
      setPaused(false);
      return;
    }
    const err = isHighlight
      ? await deleteHighlight(group.highlightId!, group.characterId)
      : await deleteStory(story.id);
    if (err) {
      setError(err);
      setPaused(false);
      return;
    }
    router.refresh();
    if (isHighlight || group.stories.length === 1) {
      setGroups((gs) => gs.filter((_, i) => i !== gi));
      if (groups.length === 1) return onClose();
      setGi(Math.min(gi, groups.length - 2));
      setSi(0);
    } else {
      setGroups((gs) =>
        gs.map((g, i) => (i === gi ? { ...g, stories: g.stories.filter((s) => s.id !== story.id) } : g)),
      );
      setSi(Math.min(si, group.stories.length - 2));
    }
    setProgress(0);
    setPaused(false);
  }

  if (!group || !story) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" role="dialog" aria-label="Story">
      <div
        className="relative flex h-dvh w-full max-w-[460px] select-none flex-col overflow-hidden bg-black sm:h-[min(92dvh,820px)] sm:rounded-2xl"
        onPointerDown={() => {
          holdRef.current = window.setTimeout(() => setPaused(true), 200);
        }}
        onPointerUp={() => {
          if (holdRef.current) clearTimeout(holdRef.current);
          setPaused(false);
        }}
        onPointerLeave={() => {
          if (holdRef.current) clearTimeout(holdRef.current);
          setPaused(false);
        }}
      >
        {story.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.image_url} alt="" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
        ) : (
          <div className="absolute inset-0" style={{ background: storyBackground(story.bg) }} />
        )}
        {story.text_content && (
          <div
            className={`absolute inset-x-0 flex justify-center px-6 ${
              story.image_url ? "bottom-20" : "inset-y-0 items-center"
            }`}
          >
            <p
              className={`whitespace-pre-line break-words text-center font-serif text-2xl leading-snug ${
                story.image_url
                  ? "rounded-xl bg-black/55 px-4 py-2 text-white"
                  : story.bg === "night" || story.bg === "ocean" || story.bg === "forest"
                    ? "text-white"
                    : "text-neutral-900"
              }`}
            >
              {story.text_content}
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />

        {/* Tipp-Zonen: links zurück, rechts weiter */}
        <button type="button" aria-label="Vorherige Story" onClick={prev} className="absolute inset-y-16 left-0 w-1/3" />
        <button type="button" aria-label="Nächste Story" onClick={next} className="absolute inset-y-16 right-0 w-2/3" />

        <div className="absolute inset-x-0 top-0 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex gap-1">
            {group.stories.map((s, i) => (
              <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                <div
                  className="h-full bg-white"
                  style={{ width: i < si ? "100%" : i === si ? `${Math.min(progress, 1) * 100}%` : "0%" }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <CharacterAvatar name={group.characterName} avatarUrl={group.avatarUrl} size={34} />
            <div className="min-w-0 flex-1 leading-tight text-white">
              <p className="truncate text-sm font-semibold">
                {group.characterName}
                {group.label && <span className="font-normal text-white/80"> · {group.label}</span>}
              </p>
              <p className="text-xs text-white/70">{timeAgo(story.created_at)}</p>
            </div>
            {group.canManage && (
              <button
                type="button"
                onClick={handleDelete}
                aria-label={group.highlightId ? "Highlight löschen" : "Story löschen"}
                className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/15"
              >
                <Trash2 className="h-5 w-5" strokeWidth={2} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/15"
            >
              <X className="h-6 w-6" strokeWidth={2} />
            </button>
          </div>
          {error && <p className="mt-2 rounded-md bg-red-600/80 px-3 py-1.5 text-xs text-white">{error}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
