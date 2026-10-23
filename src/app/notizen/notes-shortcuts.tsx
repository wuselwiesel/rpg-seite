"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard, Search, X } from "lucide-react";
import { createNote } from "./actions";
import { isFolderScope, useNotesStore } from "./notes-store";
import { useNotebookNav } from "./notebook-nav";
import { noteMatches, noteTitle } from "@/lib/notes";

export const SHORTCUTS_EVENT = "notes-open-shortcuts";
export const FOCUS_EVENT = "notes-toggle-focus";

const LIST: [string, string][] = [
  ["Alt + N", "Neue Notiz"],
  ["Alt + J", "Zu einer Notiz springen"],
  ["↑ / ↓", "In der Liste blättern"],
  ["Alt + F", "Fokus-Modus"],
  ["Strg/Cmd + F", "Suchen und Ersetzen in der Notiz"],
  ["Alt + Rücktaste", "Notiz in den Papierkorb"],
  ["Esc", "Fokus-Modus oder Fenster schließen"],
];

const editable = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
};

// Tastenkürzel des Notizbuchs: neue Notiz, Schnellwechsler, Blättern in der Liste, Fokus-Modus, Übersicht
export function NotesShortcuts() {
  const s = useNotesStore();
  const nav = useNotebookNav();
  const { activeId } = nav;
  const [switcher, setSwitcher] = useState(false);
  const [help, setHelp] = useState(false);
  const stateRef = useRef({ s, activeId, nav });
  useEffect(() => {
    stateRef.current = { s, activeId, nav };
  });

  useEffect(() => {
    const open = () => setHelp(true);
    window.addEventListener(SHORTCUTS_EVENT, open);
    return () => window.removeEventListener(SHORTCUTS_EVENT, open);
  }, []);

  useEffect(() => {
    async function onKey(e: KeyboardEvent) {
      const { s, activeId, nav } = stateRef.current;
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        if (e.code === "KeyN") {
          e.preventDefault();
          const folder = isFolderScope(s.scope) ? s.scope : null;
          const r = await createNote({ folderId: folder });
          if (r.id) {
            nav.openNote(r.id);
          }
        } else if (e.code === "KeyJ") {
          e.preventDefault();
          setSwitcher(true);
        } else if (e.code === "KeyF") {
          e.preventDefault();
          window.dispatchEvent(new Event(FOCUS_EVENT));
        } else if (e.code === "Backspace" && activeId && !editable(e.target)) {
          const n = s.notes.find((x) => x.id === activeId);
          if (n && !n.deletedAt) {
            e.preventDefault();
            await s.trash(n);
            nav.closeNote();
          }
        }
        return;
      }
      // Pfeile: in der Liste blättern, solange man nicht gerade schreibt
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && !editable(e.target) && (e.target as HTMLElement | null)?.closest?.("[data-nb-list]")) {
        const ids = s.shown.map((n) => n.id);
        if (ids.length === 0) return;
        const at = activeId ? ids.indexOf(activeId) : -1;
        const next = e.key === "ArrowDown" ? Math.min(ids.length - 1, at + 1) : Math.max(0, at === -1 ? 0 : at - 1);
        if (ids[next] && ids[next] !== activeId) {
          e.preventDefault();
          nav.openNote(ids[next]);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {switcher && <Switcher onClose={() => setSwitcher(false)} />}
      {help && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={() => setHelp(false)}>
          <div role="dialog" aria-modal="true" aria-label="Tastenkürzel" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
                <Keyboard className="h-4 w-4 text-accent" strokeWidth={2} />
                Tastenkürzel
              </h2>
              <button type="button" onClick={() => setHelp(false)} aria-label="Schließen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <dl>
              {LIST.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-1 text-sm">
                  <dt className="text-fg-soft">{v}</dt>
                  <dd className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-fg">{k}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </>
  );
}

// Schnellwechsler: Suchfeld über alle Notizen, Pfeile und Enter
function Switcher({ onClose }: { onClose: () => void }) {
  const s = useNotesStore();
  const nav = useNotebookNav();
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = s.notes.filter((n) => !n.deletedAt && noteMatches(n, q)).slice(0, 30);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function go(id: string | undefined) {
    if (!id) return;
    onClose();
    nav.openNote(id);
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/50 p-3 pt-[12vh]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Zu einer Notiz springen" onClick={(e) => e.stopPropagation()} className="flex max-h-[70dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface shadow-xl">
        <div className="relative border-b border-line">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setAt(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setAt((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setAt((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(results[at]?.id);
              }
            }}
            placeholder="Notiz suchen"
            aria-label="Notiz suchen"
            className="w-full bg-transparent py-3.5 pl-11 pr-4 text-sm text-fg outline-none"
          />
        </div>
        <ul className="overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-3 text-sm text-muted">Nichts gefunden.</li>}
          {results.map((n, i) => (
            <li key={n.id}>
              <button type="button" onClick={() => go(n.id)} onMouseEnter={() => setAt(i)} className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-fg ${i === at ? "bg-surface-2" : ""}`}>
                {noteTitle(n)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
