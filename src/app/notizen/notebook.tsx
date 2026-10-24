"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers, NotebookPen, X } from "lucide-react";
import { loadNoteBundle, loadNotebook, type NoteBundle, type NotebookData } from "./notebook-actions";
import { NotebookNavContext, useNotebookNav, type NotebookNav, type NotebookRequest, type NotebookView } from "./notebook-nav";
import { NotesProvider, useNotesStore } from "./notes-store";
import { NotesList } from "./notes-list";
import { FOCUS_EVENT, NotesShortcuts } from "./notes-shortcuts";
import { TemplatesView } from "./vorlagen/templates-view";
import { NoteEditor } from "./(bear)/[id]/note-editor";
import { type NoteView } from "@/lib/notes";

// Karteitabs: Farbe je Reiter (Karton, immer dunkle Schrift)
const TAB_COLOR: Record<string, string> = { all: "#e8d7a3", pinned: "#f1c7bb", templates: "#c8d9ea", archive: "#d9cdea", trash: "#e3cfb3" };

// Papiersorten des Buchs (Farben und Linien in globals.css, [data-nb-paper]); „auto“ folgt Hell/Dunkel
const PAPERS = [
  { id: "auto", label: "Automatisch" },
  { id: "elfenbein", label: "Elfenbein" },
  { id: "liniert", label: "Liniert" },
  { id: "kariert", label: "Kariert" },
  { id: "pergament", label: "Pergament" },
  { id: "graphit", label: "Graphit" },
  { id: "tinte", label: "Tinte" },
] as const;
type Paper = (typeof PAPERS)[number]["id"];
const PAPER_KEY = "wortwinkel:nb-paper";

// Gewähltes Papier, gemerkt in diesem Browser
function usePaper(): [Paper, (p: Paper) => void] {
  // Das Buch erscheint erst nach einem Klick (nie beim Server-Rendern), darum direkt aus dem Speicher lesen
  const [paper, setPaper] = useState<Paper>(() => {
    try {
      const saved = localStorage.getItem(PAPER_KEY);
      return saved && PAPERS.some((p) => p.id === saved) ? (saved as Paper) : "auto";
    } catch {
      return "auto";
    }
  });
  const choose = (p: Paper) => {
    setPaper(p);
    try {
      localStorage.setItem(PAPER_KEY, p);
    } catch {
      /* nur für diese Sitzung */
    }
  };
  return [paper, choose];
}

// Das Notizbuch als aufgeschlagenes Buch im Fenster: links Liste (oder Vorlagen), rechts die Notiz, Karteitabs am Rand.
export function Notebook({ request, onClose }: { request: NotebookRequest; onClose: () => void }) {
  const [data, setData] = useState<NotebookData | null>(null);
  const [failed, setFailed] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [bundleVersion, setBundleVersion] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(request.noteId);
  const [view, setView] = useState<NotebookView>(request.view ?? "notes");
  const [seenSeq, setSeenSeq] = useState(request.seq);
  if (seenSeq !== request.seq) {
    setSeenSeq(request.seq);
    setActiveId(request.noteId);
    if (request.view) setView(request.view);
  }
  const [bundle, setBundle] = useState<NoteBundle | null>(null);
  const [focus, setFocus] = useState(false);
  const [paper, setPaper] = usePaper();
  const rootRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef(false);
  const dataRef = useRef<NotebookData | null>(null);
  const reloadedFor = useRef(new Set<string>());

  useEffect(() => {
    focusRef.current = focus;
    dataRef.current = data;
  });

  // Liste, Ordner, Vorlagen und Welten laden (und neu laden, wenn sich etwas Grundlegendes geändert hat)
  useEffect(() => {
    let cancelled = false;
    loadNotebook()
      .then((d) => {
        if (cancelled) return;
        if (d) {
          setFailed(false);
          setData(d);
        } else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  // Die gewählte Notiz mit allem, was der Editor braucht
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    loadNoteBundle(activeId)
      .then((b) => {
        if (cancelled) return;
        if (!b) return setActiveId(null);
        setBundle(b);
        // Neue Notiz, die die Liste noch nicht kennt: Liste neu laden
        const d = dataRef.current;
        if (d && !b.isTemplate && !d.notes.some((n) => n.id === b.id) && !reloadedFor.current.has(b.id)) {
          reloadedFor.current.add(b.id);
          setDataVersion((v) => v + 1);
        }
      })
      .catch(() => !cancelled && setActiveId(null));
    return () => {
      cancelled = true;
    };
  }, [activeId, bundleVersion]);

  // Fokus-Modus (Alt+F): die Notiz füllt den Bildschirm
  useEffect(() => {
    const toggle = () => setFocus((v) => !v);
    window.addEventListener(FOCUS_EVENT, toggle);
    return () => window.removeEventListener(FOCUS_EVENT, toggle);
  }, []);

  // Esc: erst Fokus-Modus, dann das Buch schließen; offene Fenster und Menüs im Buch schließen sich zuerst selbst
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelectorAll('[aria-modal="true"]').length > 1) return;
      if (rootRef.current?.querySelector('[role="menu"], [role="dialog"]')) return;
      if (focusRef.current) return setFocus(false);
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Seite dahinter bleibt stehen; beim Schließen springt der Fokus zurück
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    rootRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);

  const nav = useMemo<NotebookNav>(
    () => ({
      activeId,
      openNote: setActiveId,
      closeNote: () => setActiveId(null),
      view,
      setView,
      reload: () => {
        setDataVersion((v) => v + 1);
        setBundleVersion((v) => v + 1);
      },
      refreshNote: () => {
        setBundle(null);
        setBundleVersion((v) => v + 1);
      },
      close: onClose,
    }),
    [activeId, view, onClose],
  );

  // Klick neben das Buch schließt es (nur wenn auch das Drücken dort begann, damit Textmarkieren nicht schließt)
  const downOnBackdrop = useRef(false);
  const shownBundle = activeId && bundle?.id === activeId ? bundle : null;

  return (
    <NotebookNavContext.Provider value={nav}>
      <div
        className="nb-backdrop"
        onMouseDown={(e) => {
          downOnBackdrop.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (downOnBackdrop.current && e.target === e.currentTarget) onClose();
        }}
      >
        <div ref={rootRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Notizbuch" className="nb-book" data-nb-paper={paper} data-note={activeId ? "" : undefined}>
          {data ? (
            <NotesProvider notes={data.notes} folders={data.folders} worlds={data.worlds} activeWorldId={data.activeWorldId} openCount={data.openCount} onScope={() => setView("notes")}>
              <NotesShortcuts />
              <Frame tabs={<Tabs templateCount={data.templates.length} />} onClose={onClose} paper={paper} onPaper={setPaper}>
                <section className="nb-page nb-left" aria-label={view === "templates" ? "Vorlagen" : "Notizen"}>
                  <LeftPage templates={data.templates} templatesKey={dataVersion} />
                </section>
                <section className={focus ? "fixed inset-0 z-[80] block overflow-y-auto bg-app" : "nb-page nb-right"} aria-label="Notiz">
                  <div className={focus ? "" : "nb-scroll"}>
                    <RightPage bundle={shownBundle} loading={!!activeId} />
                  </div>
                </section>
              </Frame>
            </NotesProvider>
          ) : (
            <Frame tabs={null} onClose={onClose} paper={paper} onPaper={setPaper}>
              <section className="nb-page nb-left">
                <p role={failed ? "alert" : "status"} className="p-6 text-sm text-muted">
                  {failed ? "Das Notizbuch konnte nicht geladen werden." : "Lädt …"}
                </p>
              </section>
              <section className="nb-page nb-right" />
            </Frame>
          )}
        </div>
      </div>
    </NotebookNavContext.Provider>
  );
}

// Einband, Ringe, Papierwahl und Schließen-Knopf um die beiden Seiten
function Frame({ tabs, onClose, paper, onPaper, children }: { tabs: React.ReactNode; onClose: () => void; paper: Paper; onPaper: (p: Paper) => void; children: React.ReactNode }) {
  return (
    <>
      {tabs}
      <PaperPicker paper={paper} onPaper={onPaper} />
      <button type="button" onClick={onClose} aria-label="Notizbuch schließen" title="Schließen (Esc)" className="nb-close">
        <X className="h-4 w-4" strokeWidth={2.25} />
      </button>
      <div className="nb-cover">
        <div className="nb-pages">
          {children}
          <div className="nb-gutter" aria-hidden>
            <div className="nb-spine">
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} className="nb-ring" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PaperPicker({ paper, onPaper }: { paper: Paper; onPaper: (p: Paper) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  return (
    <div ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Papier wählen" title="Papier" className="nb-paper-btn">
        <Layers className="h-4 w-4" strokeWidth={2.25} />
      </button>
      {open && (
        // role="dialog": Esc schließt erst die Auswahl, nicht das Buch
        <div role="dialog" aria-label="Papier" className="nb-paper-menu">
          <div role="radiogroup" aria-label="Papier" className="nb-paper-grid">
            {PAPERS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={paper === p.id}
                onClick={() => onPaper(p.id)}
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                className="nb-swatch"
              >
                <span className="nb-swatch-chip" data-nb-paper={p.id} />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Tabs({ templateCount }: { templateCount: number }) {
  const s = useNotesStore();
  const nav = useNotebookNav();
  const active = nav.view === "templates" ? "templates" : s.scope === "pinned" ? "pinned" : s.scope === "archive" ? "archive" : s.scope === "trash" ? "trash" : "all";
  const tabs: { id: string; label: string; count: number | null; go: () => void }[] = [
    { id: "all", label: "Alle", count: s.live.length, go: () => s.setScope("all") },
    { id: "pinned", label: "Angeheftet", count: s.pinnedCount, go: () => s.setScope("pinned") },
    { id: "templates", label: "Vorlagen", count: templateCount, go: () => nav.setView("templates") },
    { id: "archive", label: "Archiv", count: s.archived.length, go: () => s.setScope("archive") },
    { id: "trash", label: "Papierkorb", count: s.trashed.length, go: () => s.setScope("trash") },
  ];
  return (
    <div className="nb-tabs" role="tablist" aria-label="Register" aria-orientation="vertical">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          onClick={() => {
            // Am Handy zeigt das Buch nur eine Seite: die Notiz zuklappen, damit die gewählte Liste zu sehen ist
            if (window.matchMedia("(max-width: 1023px)").matches) nav.closeNote();
            t.go();
          }}
          className="nb-tab"
          style={{ "--tab": TAB_COLOR[t.id] } as React.CSSProperties}
        >
          <span>{t.label}</span>
          {t.count ? <span className="nb-tab-count">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

function LeftPage({ templates, templatesKey }: { templates: NoteView[]; templatesKey: number }) {
  const nav = useNotebookNav();
  if (nav.view === "templates") {
    return (
      <div className="nb-scroll px-3 py-4">
        <h1 className="mb-4 font-serif text-3xl text-fg">Vorlagen</h1>
        <TemplatesView key={templatesKey} templates={templates} />
      </div>
    );
  }
  return (
    <div data-nb-list className="nb-scroll min-w-0">
      <NotesList />
    </div>
  );
}

function RightPage({ bundle, loading }: { bundle: NoteBundle | null; loading: boolean }) {
  if (!bundle) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center text-muted">
        {loading ? <p role="status" className="text-sm">Lädt …</p> : <NotebookPen className="h-10 w-10 opacity-30" strokeWidth={1.5} aria-hidden />}
      </div>
    );
  }
  return (
    <NoteEditor
      key={bundle.id}
      id={bundle.id}
      initialTitle={bundle.title}
      initialBody={bundle.body}
      initialPinned={bundle.pinned}
      initialLinks={bundle.links}
      initialTags={bundle.tags}
      initialFolderId={bundle.folderId}
      initialWorldId={bundle.worldId}
      initialIsTemplate={bundle.isTemplate}
      initialArchived={bundle.archived}
      initialDeletedAt={bundle.deletedAt}
      createdAt={bundle.createdAt}
      initialUpdatedAt={bundle.updatedAt}
      worlds={bundle.worlds}
      folders={bundle.folders}
      allTags={bundle.allTags}
      backlinks={bundle.backlinks}
      linkPages={bundle.linkPages}
      linkCharacters={bundle.linkCharacters}
    />
  );
}
