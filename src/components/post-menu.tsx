"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Ellipsis, ExternalLink, Link2, Pin, Trash2, User } from "lucide-react";
import { deletePost, togglePinPost, updatePostCreatedAt } from "@/app/posts/actions";

// Lokale Uhrzeit im Format für <input type="datetime-local"> (JJJJ-MM-TTThh:mm).
function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// "⋯"-Menü im Post-Kopf (wie bei Instagram): öffnen, Profil, Link kopieren; für eigene Beiträge
// anpinnen/löschen/Datum ändern (z.B. um eine glaubwürdige Zeitlinie herzustellen).
export function PostMenu({
  postId,
  characterHref,
  isOwn,
  pinned,
  createdAt,
}: {
  postId: string;
  characterHref: string;
  isOwn: boolean;
  pinned: boolean;
  createdAt: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(() => toLocalInputValue(createdAt));
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingDate(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setEditingDate(false);
      }
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`);
      setNote("Link kopiert");
    } catch {
      setNote("Kopieren nicht möglich");
    }
    setTimeout(() => {
      setNote(null);
      setOpen(false);
    }, 1100);
  }

  const item =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-fg transition hover:bg-surface-2 active:bg-surface-3 disabled:opacity-50";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setEditingDate(false);
        }}
        aria-label="Mehr Optionen"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-fg transition active:scale-90 hover:bg-surface-2"
      >
        <Ellipsis className="h-5 w-5" strokeWidth={2} />
      </button>
      {open && (
        <div
          role="menu"
          className={`menu-pop absolute right-0 top-full z-30 mt-1 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface p-1.5 shadow-lg ${editingDate ? "w-72" : "w-56"}`}
        >
          {editingDate ? (
            <div className="flex flex-col gap-2 p-1.5">
              <input
                type="datetime-local"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="w-full min-w-0 rounded-md border border-line bg-app px-2 py-1.5 text-sm text-fg outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending || !dateValue}
                  onClick={() =>
                    startTransition(async () => {
                      const iso = new Date(dateValue).toISOString();
                      const err = await updatePostCreatedAt(postId, iso);
                      if (err) {
                        setNote(err);
                        return;
                      }
                      setEditingDate(false);
                      router.refresh();
                      setOpen(false);
                    })
                  }
                  className="flex-1 rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? "..." : "Speichern"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDate(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-fg"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : note ? (
            <p className="px-3 py-2.5 text-sm text-muted" role="status">
              {note}
            </p>
          ) : (
            <>
              <Link href={`/posts/${postId}`} className={item} onClick={() => setOpen(false)}>
                <ExternalLink className="h-4 w-4 text-muted" strokeWidth={2} /> Beitrag öffnen
              </Link>
              <Link href={characterHref} className={item} onClick={() => setOpen(false)}>
                <User className="h-4 w-4 text-muted" strokeWidth={2} /> Profil ansehen
              </Link>
              <button type="button" className={item} onClick={copyLink}>
                <Link2 className="h-4 w-4 text-muted" strokeWidth={2} /> Link kopieren
              </button>
              {isOwn && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDateValue(toLocalInputValue(createdAt));
                      setEditingDate(true);
                    }}
                    className={item}
                  >
                    <Clock className="h-4 w-4 text-muted" strokeWidth={2} /> Datum ändern
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className={item}
                    onClick={() =>
                      startTransition(async () => {
                        const err = await togglePinPost(postId);
                        setNote(err ?? (pinned ? "Nicht mehr angepinnt" : "Angepinnt"));
                        router.refresh();
                        setTimeout(() => {
                          setNote(null);
                          setOpen(false);
                        }, 1200);
                      })
                    }
                  >
                    <Pin className="h-4 w-4 text-muted" strokeWidth={2} /> {pinned ? "Nicht mehr anpinnen" : "Anpinnen"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className={`${item} !text-red-600 dark:!text-red-400`}
                    onClick={() => {
                      if (!window.confirm("Diesen Beitrag endgültig löschen?")) return;
                      startTransition(async () => {
                        const err = await deletePost(postId);
                        if (err) setNote(err);
                        else {
                          setOpen(false);
                          router.refresh();
                        }
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} /> Löschen
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
