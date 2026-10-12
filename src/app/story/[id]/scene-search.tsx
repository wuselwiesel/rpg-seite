"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { highlightEntries } from "@/lib/scene-quote";
import { formatDateTime } from "@/lib/format";
import { searchSceneEntries, type SceneHit } from "../entries-actions";

// Suche in den Beiträgen der Szene; ein Treffer springt zum Beitrag (nicht geladene frühere Beiträge werden dafür nachgeladen).
export function SceneSearch({ storyPostId }: { storyPostId: string }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<SceneHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Beim Tippen kurz warten, dann suchen
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return;
    const t = window.setTimeout(() => {
      startTransition(async () => {
        const res = await searchSceneEntries(storyPostId, q);
        if ("error" in res) {
          setError(res.error);
          setHits(null);
        } else {
          setError(null);
          setHits(res.hits);
        }
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [term, storyPostId]);

  const shownHits = term.trim().length >= 2 ? hits : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="In der Szene suchen"
        title="In der Szene suchen"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-fg-soft transition hover:text-fg active:scale-95"
      >
        <Search className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {open && (
        <div className="menu-pop absolute right-0 top-full z-30 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-2 shadow-lg">
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Suchen"
              aria-label="In der Szene suchen"
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-app px-2.5 text-sm outline-none focus:border-accent"
            />
            {term && (
              <button type="button" onClick={() => setTerm("")} aria-label="Suche leeren" className="rounded-md p-1.5 text-muted hover:text-fg">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>
          {error && <p className="mt-2 px-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
          {shownHits && (
            <ul className="mt-2 flex max-h-72 flex-col overflow-y-auto" aria-busy={pending}>
              {shownHits.length === 0 && <li className="px-2 py-1.5 text-sm text-muted">Nichts gefunden</li>}
              {shownHits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      highlightEntries([h.id]);
                    }}
                    className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-2"
                  >
                    <span className="flex items-baseline justify-between gap-2 text-xs text-muted">
                      <span className="truncate font-medium text-fg-soft">{h.name}</span>
                      <span className="shrink-0">{formatDateTime(h.at)}</span>
                    </span>
                    <span className="text-sm text-fg">{h.snippet}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
