"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { searchLinkTargets } from "@/app/notizen/actions";
import { LINK_KINDS, type LinkKind, type LinkTarget } from "@/lib/notes";
import { KIND_ICON } from "./note-link-chip";

// Fenster zum Verknüpfen: Art wählen (Charakter, Wiki, Szene, Ausschnitt, Notiz), suchen, antippen.
export function NoteLinkPicker({
  noteId,
  taken,
  onPick,
  onClose,
}: {
  noteId: string;
  // bereits verknüpfte Ziele ("art:id"), werden als erledigt markiert
  taken: Set<string>;
  onPick: (target: LinkTarget) => Promise<string | null>;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<LinkKind>("character");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ key: string; list: LinkTarget[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const key = `${kind}|${q}`;
    const t = setTimeout(() => {
      void searchLinkTargets(q, kind, noteId).then((r) => {
        if (!cancelled) setFound({ key, list: r });
      });
    }, q ? 200 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, kind, noteId]);

  // Solange die Antwort noch zu einer älteren Eingabe gehört, gilt die Liste als „lädt“
  const results = found && found.key === `${kind}|${q}` ? found.list : null;

  async function pick(t: LinkTarget) {
    setError(null);
    const err = await onPick(t);
    if (err) setError(err);
    else setAdded((cur) => new Set(cur).add(`${t.kind}:${t.id}`));
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Verknüpfen" onClick={(e) => e.stopPropagation()} className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="text-base font-semibold text-fg">Verknüpfen</h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 pb-2">
          {LINK_KINDS.map((k) => {
            const Icon = KIND_ICON[k.kind];
            const on = k.kind === kind;
            return (
              <button
                key={k.kind}
                type="button"
                onClick={() => setKind(k.kind)}
                aria-pressed={on}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${on ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {k.plural}
              </button>
            );
          })}
        </div>
        <div className="relative px-4 pb-2">
          <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-[60%] text-muted" strokeWidth={2} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen" className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-accent" />
        </div>
        <ul className="min-h-[8rem] flex-1 overflow-y-auto px-2 pb-3">
          {results === null && <li className="px-3 py-3 text-sm text-muted">Lädt …</li>}
          {results?.length === 0 && <li className="px-3 py-3 text-sm text-muted">Nichts gefunden.</li>}
          {results?.map((t) => {
            const key = `${t.kind}:${t.id}`;
            const done = taken.has(key) || added.has(key);
            const Icon = KIND_ICON[t.kind];
            return (
              <li key={key}>
                <button type="button" disabled={done} onClick={() => void pick(t)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-surface-2 disabled:opacity-50">
                  {t.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-fg">{t.label}</span>
                    {t.sub && <span className="block truncate text-xs text-muted">{t.sub}</span>}
                  </span>
                  {done && <span className="text-xs text-muted">Verknüpft</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {error && <p className="px-5 pb-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>,
    document.body,
  );
}
