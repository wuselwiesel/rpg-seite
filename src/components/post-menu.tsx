"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ellipsis, ExternalLink, Link2, Pin, Trash2, User } from "lucide-react";
import { deletePost, togglePinPost } from "@/app/posts/actions";

// "⋯"-Menü im Post-Kopf (wie bei Instagram): öffnen, Profil, Link kopieren; für eigene Beiträge anpinnen/löschen.
export function PostMenu({
  postId,
  characterHref,
  isOwn,
  pinned,
}: {
  postId: string;
  characterHref: string;
  isOwn: boolean;
  pinned: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
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
        onClick={() => setOpen((v) => !v)}
        aria-label="Mehr Optionen"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-fg transition active:scale-90 hover:bg-surface-2"
      >
        <Ellipsis className="h-5 w-5" strokeWidth={2} />
      </button>
      {open && (
        <div
          role="menu"
          className="menu-pop absolute right-0 top-full z-30 mt-1 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-lg"
        >
          {note ? (
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
