"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Heart, Send, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import { deleteHighlight, deleteStory, replyToStory, toggleStoryLike } from "@/app/stories/actions";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/stories";
import { StoryStage } from "./story-stage";
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
  viewerCharacterId,
}: {
  // Aktiver Charakter der betrachtenden Person: darf liken und antworten (außer bei eigenen Storys).
  viewerCharacterId?: string;
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
      {open && (
        <StoryViewer
          groups={groups}
          startIndex={startIndex}
          viewerCharacterId={viewerCharacterId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function StoryViewer({
  groups: initialGroups,
  startIndex,
  viewerCharacterId,
  onClose,
}: {
  groups: StoryGroup[];
  startIndex: number;
  viewerCharacterId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(0);
  const [progress, setProgress] = useState(0);
  const [holdPaused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const holdRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [likes, setLikes] = useState<string[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyFocus, setReplyFocus] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showHeart, setShowHeart] = useState(false);
  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };
  // Videos bestimmen ihre eigene Laufzeit (max. 60 s), Bilder und Text laufen SLIDE_MS.
  const [videoMs, setVideoMs] = useState<{ id: string; ms: number } | null>(null);

  const paused = holdPaused || replyFocus;
  const group = groups[gi];
  const story = group?.stories[si];
  const slideMs = story && videoMs?.id === story.id ? videoMs.ms : SLIDE_MS;

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

  // Herzen der aktuellen Story laden (Anzahl für die Besitzerin, "geliked" für alle anderen).
  const storyId = story?.id;
  useEffect(() => {
    if (!storyId) return;
    let cancelled = false;
    createClient()
      .from("story_likes")
      .select("character_id")
      .eq("story_id", storyId)
      .then(({ data }) => {
        if (!cancelled) setLikes((data ?? []).map((r) => r.character_id as string));
      });
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (paused) el.pause();
    else
      el.play().catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });
  }, [paused, story?.id]);

  // Musik der Story: startet mit der Story, pausiert mit ihr.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (paused) el.pause();
    else el.play().catch(() => {});
  }, [paused, story?.id, story?.audio_url]);

  useEffect(() => {
    if (paused || !story) return;
    const started = Date.now() - progress * slideMs;
    const timer = setInterval(() => {
      const p = (Date.now() - started) / slideMs;
      if (p >= 1) next();
      else setProgress(p);
    }, 50);
    return () => clearInterval(timer);
    // progress bewusst nicht als Abhängigkeit: Start-Offset nur beim (Wieder-)Starten lesen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, story, next, slideMs]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
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

  const iLiked = Boolean(viewerCharacterId && likes.includes(viewerCharacterId));
  const canInteract = Boolean(viewerCharacterId && group && story && group.characterId !== viewerCharacterId);

  async function handleLike() {
    if (!story || !viewerCharacterId) return;
    const wasLiked = iLiked;
    setLikes((prev) => (wasLiked ? prev.filter((id) => id !== viewerCharacterId) : [...prev, viewerCharacterId]));
    if (!wasLiked) {
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
    }
    const result = await toggleStoryLike(story.id);
    if ("error" in result) {
      setLikes((prev) => (wasLiked ? [...prev, viewerCharacterId] : prev.filter((id) => id !== viewerCharacterId)));
      flash(result.error);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!story || !replyText.trim()) return;
    const text = replyText;
    setReplyText("");
    (document.activeElement as HTMLElement | null)?.blur();
    const err = await replyToStory(story.id, text);
    if (err) {
      setReplyText(text);
      flash(err);
    } else flash("Antwort gesendet");
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
        <div className="absolute inset-0 flex items-center justify-center" style={{ containerType: "size" }}>
          <StoryStage
            story={story}
            videoProps={{
              ref: videoRef,
              autoPlay: true,
              muted,
              onLoadedMetadata: (e) => {
                const d = e.currentTarget.duration;
                if (Number.isFinite(d) && d > 0) setVideoMs({ id: story.id, ms: Math.min(d * 1000, 60_000) });
              },
            }}
          />
        </div>

        {story.audio_url && <audio key={story.id} ref={audioRef} src={story.audio_url} autoPlay loop muted={muted} />}

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
            {(story.audio_url || story.video_url) && (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Ton an" : "Ton aus"}
                className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/15"
              >
                {muted ? <VolumeX className="h-5 w-5" strokeWidth={2} /> : <Volume2 className="h-5 w-5" strokeWidth={2} />}
              </button>
            )}
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

        {showHeart && (
          <Heart
            aria-hidden
            className="heart-pop pointer-events-none absolute left-1/2 top-1/2 z-10 h-28 w-28 fill-white text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
            strokeWidth={0}
          />
        )}
        {toast && (
          <p className="pointer-events-none absolute inset-x-0 bottom-20 z-10 mx-auto w-fit rounded-full bg-black/70 px-4 py-2 text-sm text-white">
            {toast}
          </p>
        )}

        {canInteract ? (
          <form
            onSubmit={handleReply}
            className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent px-3 pt-8"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setReplyFocus(true)}
              onBlur={() => setReplyFocus(false)}
              maxLength={1000}
              placeholder={`Antworten an ${group.characterName}...`}
              aria-label="Auf die Story antworten"
              className="min-w-0 flex-1 rounded-full border border-white/60 bg-black/20 px-4 py-2.5 text-base text-white outline-none placeholder:text-white/75 focus:border-white"
            />
            {replyText.trim() ? (
              <button type="submit" aria-label="Antwort senden" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white">
                <Send className="h-6 w-6" strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLike}
                aria-pressed={iLiked}
                aria-label={iLiked ? "Gefällt mir nicht mehr" : "Gefällt mir"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition active:scale-90"
              >
                <Heart className={`h-7 w-7 ${iLiked ? "fill-[#ed4956] text-[#ed4956]" : ""}`} strokeWidth={iLiked ? 0 : 2} />
              </button>
            )}
          </form>
        ) : group.canManage && likes.length > 0 ? (
          <p
            className="absolute bottom-0 left-0 z-10 flex items-center gap-1.5 px-4 text-sm font-medium text-white"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <Heart className="h-4 w-4 fill-white" strokeWidth={0} />
            {likes.length}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
