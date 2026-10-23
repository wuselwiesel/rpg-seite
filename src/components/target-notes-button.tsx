"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { NotebookPen, Plus, X } from "lucide-react";
import { createNote, loadTargetNotes } from "@/app/notizen/actions";
import { noteSnippet, type LinkKind } from "@/lib/notes";
import { TemplateMenu } from "./template-menu";

type Item = { id: string; title: string; body: string; updatedAt: string };

// Notizsymbol an Charakter, Wiki-Seite oder Szene: zeigt die eigenen Notizen dazu und nimmt eine Schnellnotiz auf, ohne die Seite zu verlassen.
export function TargetNotesButton({ kind, targetId, targetLabel, count: initialCount = 0, className = "", showLabel = false }: { kind: LinkKind; targetId: string; targetLabel: string; count?: number; className?: string; showLabel?: boolean }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Notizen zu ${targetLabel}`}
        aria-label={`Notizen zu ${targetLabel}`}
        className={`inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-xs transition hover:bg-surface-2 hover:text-fg ${count > 0 ? "text-fg-soft" : "text-muted/70"} ${className}`}
      >
        <NotebookPen className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        {showLabel && <span>Notizen</span>}
        {count > 0 && <span className="tabular-nums">{count}</span>}
      </button>
      {open && <NotesDialog kind={kind} targetId={targetId} targetLabel={targetLabel} onClose={() => setOpen(false)} onCount={setCount} />}
    </>
  );
}

function NotesDialog({ kind, targetId, targetLabel, onClose, onCount }: { kind: LinkKind; targetId: string; targetLabel: string; onClose: () => void; onCount: (n: number) => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadTargetNotes(kind, targetId).then((r) => {
      if (cancelled) return;
      setItems(r);
      onCount(r.length);
    });
    areaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
    };
  }, [kind, targetId, onClose, onCount]);

  function add() {
    if (!text.trim()) return;
    setError(null);
    start(async () => {
      const r = await createNote({ text, link: { kind, id: targetId } });
      if (r.error) return setError(r.error);
      setText("");
      const list = await loadTargetNotes(kind, targetId);
      setItems(list);
      onCount(list.length);
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Notizen" onClick={(e) => e.stopPropagation()} className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-fg">
            <NotebookPen className="h-[18px] w-[18px] shrink-0 text-accent" strokeWidth={2} />
            <span className="truncate">{targetLabel}</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="flex flex-col gap-2 px-5 pb-3">
          <textarea
            ref={areaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
            }}
            rows={3}
            maxLength={5000}
            placeholder="Schnell notieren"
            aria-label="Schnell notieren"
            className="w-full resize-y rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Link href="/notizen" onClick={onClose} className="text-xs text-muted hover:text-fg">
                Alle Notizen
              </Link>
              <TemplateMenu link={{ kind, id: targetId }} onCreated={onClose} className="[&>button]:px-2.5 [&>button]:py-1 [&>button]:text-xs [&>div]:left-0 [&>div]:right-auto" />
            </div>
            <button type="button" onClick={add} disabled={pending || !text.trim()} className="flex items-center gap-1 rounded-full bg-accent-strong px-3.5 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
              Notieren
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <ul className="flex-1 overflow-y-auto border-t border-line px-2 py-2">
          {items === null && <li className="px-3 py-3 text-sm text-muted">Lädt …</li>}
          {items?.length === 0 && <li className="px-3 py-3 text-sm text-muted">Noch keine Notizen dazu.</li>}
          {items?.map((n) => (
            <li key={n.id}>
              <Link href={`/notizen/${n.id}`} onClick={onClose} className="block rounded-xl px-3 py-2 transition hover:bg-surface-2">
                <span className="block truncate text-sm font-medium text-fg">{n.title}</span>
                {noteSnippet(n.body, 100) && n.title !== noteSnippet(n.body, 60) && <span className="line-clamp-2 text-xs text-fg-soft">{noteSnippet(n.body, 100)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
