"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BookMarked, X } from "lucide-react";
import { appendSceneNote, listWikiTargets, type WikiTarget } from "@/app/wiki/scene-note-actions";

type Sel = { text: string; entryId: string | null; x: number; y: number };

// Text in der Szene markieren → „Ins Wiki“: eine Notiz mit Link zur Stelle an einen Wiki-Eintrag hängen (zum Beispiel an die Figur).
export function SelectionToWiki({ sceneId }: { sceneId: string }) {
  const [sel, setSel] = useState<Sel | null>(null);
  const [open, setOpen] = useState<Sel | null>(null);
  const [targets, setTargets] = useState<WikiTarget[] | null>(null);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<WikiTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<WikiTarget | null>(null);
  const [pending, start] = useTransition();
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open !== null;
  }, [open]);

  useEffect(() => {
    function onChange() {
      if (openRef.current) return;
      const s = window.getSelection();
      if (!s || s.isCollapsed || s.rangeCount === 0) return setSel(null);
      const text = s.toString().replace(/\s+/g, " ").trim();
      if (text.length < 2 || text.length > 600) return setSel(null);
      const a = (s.anchorNode instanceof Element ? s.anchorNode : s.anchorNode?.parentElement)?.closest('[id^="beitrag-"]');
      const f = (s.focusNode instanceof Element ? s.focusNode : s.focusNode?.parentElement)?.closest('[id^="beitrag-"]');
      if (!a || a !== f) return setSel(null);
      const r = s.getRangeAt(0).getBoundingClientRect();
      setSel({ text, entryId: a.id.replace("beitrag-", ""), x: Math.min(Math.max(r.left + r.width / 2, 70), window.innerWidth - 70), y: Math.min(r.bottom + 8, window.innerHeight - 56) });
    }
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, []);

  async function openDialog(s: Sel) {
    setOpen(s);
    setNote(`„${s.text}“`);
    setQuery("");
    setPicked(null);
    setError(null);
    setDone(null);
    const list = targets ?? (await listWikiTargets());
    setTargets(list);
    // Vorauswahl: eine Figur oder Seite, deren Titel im markierten Text vorkommt (längster Titel gewinnt)
    const lower = s.text.toLowerCase();
    const hit = list.filter((t) => t.title.length >= 3 && lower.includes(t.title.toLowerCase())).sort((a, b) => b.title.length - a.title.length)[0];
    if (hit) setPicked(hit);
  }

  const matches = useMemo(() => {
    const list = targets ?? [];
    const q = query.trim().toLowerCase();
    return (q ? list.filter((t) => t.title.toLowerCase().includes(q)) : list.filter((t) => t.isCharacter)).slice(0, 8);
  }, [targets, query]);

  function close() {
    setOpen(null);
    setSel(null);
    window.getSelection()?.removeAllRanges();
  }

  function submit() {
    if (!open || !picked) return;
    start(async () => {
      const res = await appendSceneNote(picked.id, note, sceneId, open.entryId);
      if ("error" in res) setError(res.error);
      else setDone(picked);
    });
  }

  return (
    <>
      {sel && !open && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void openDialog(sel)}
          style={{ left: sel.x, top: sel.y, transform: "translateX(-50%)" }}
          className="fixed z-40 flex w-max items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-strong px-3.5 py-2 text-sm font-medium text-on-accent-strong shadow-lg"
        >
          <BookMarked className="h-4 w-4" strokeWidth={2} />
          Ins Wiki
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Ins Wiki">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl border border-line bg-app p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl text-fg">Ins Wiki</h2>
              <button type="button" onClick={close} aria-label="Schließen" className="rounded p-1 text-muted hover:text-fg">
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            {done ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-fg">Angehängt an „{done.title}“.</p>
                <Link href={`/wiki/${done.id}`} className="w-fit rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:text-fg">
                  Seite öffnen
                </Link>
              </div>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-sm text-fg-soft">
                  Notiz
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={1000} className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm" />
                </label>
                <div className="flex flex-col gap-1.5 text-sm text-fg-soft">
                  Wiki-Seite
                  {picked ? (
                    <div className="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2 text-fg">
                      <span className="min-w-0 truncate">{picked.title}</span>
                      <button type="button" onClick={() => setPicked(null)} className="shrink-0 text-xs text-muted hover:text-fg">
                        Ändern
                      </button>
                    </div>
                  ) : (
                    <>
                      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Seite suchen" className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm" />
                      <ul className="flex flex-col">
                        {targets === null && <li className="px-1 py-1 text-muted">Lädt…</li>}
                        {matches.map((t) => (
                          <li key={t.id}>
                            <button type="button" onClick={() => setPicked(t)} className="w-full rounded-md px-3 py-2 text-left text-fg transition hover:bg-surface-2">
                              {t.title}
                            </button>
                          </li>
                        ))}
                        {targets !== null && matches.length === 0 && <li className="px-1 py-1 text-muted">Keine Seite gefunden.</li>}
                      </ul>
                    </>
                  )}
                </div>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={close} className="rounded-lg px-3 py-1.5 text-sm text-fg-soft hover:text-fg">
                    Abbrechen
                  </button>
                  <button type="button" disabled={!picked || !note.trim() || pending} onClick={submit} className="rounded-lg bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong disabled:opacity-40">
                    {pending ? "Hängt an…" : "Anhängen"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
