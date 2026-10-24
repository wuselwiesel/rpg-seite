"use client";

import { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { NotebookRequest, NotebookView } from "@/app/notizen/notebook-nav";

// Das Notizbuch wird erst beim ersten Öffnen geladen (Editor und Listen sind schwer)
const Notebook = lazy(() => import("@/app/notizen/notebook").then((m) => ({ default: m.Notebook })));

type OpenOptions = { noteId?: string | null; view?: NotebookView };
type Ctx = { open: (opts?: OpenOptions) => void; close: () => void };

const NotebookContext = createContext<Ctx>({
  open: (opts) => {
    // Ohne Notizbuch (nicht angemeldet) bleibt nur die Adresse
    window.location.assign(opts?.noteId ? `/notizen/${opts.noteId}` : "/notizen");
  },
  close: () => {},
});

export function useNotebook(): Ctx {
  return useContext(NotebookContext);
}

// Adressen des Notizbuchs: /notizen, /notizen/vorlagen, /notizen/<id> (alte Links auf /notizen/faeden öffnen die Liste)
const NOTEBOOK_HREF = /^\/notizen(?:\/(faeden|vorlagen|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?\/?(?:[?#].*)?$/;

export function parseNotebookHref(href: string): OpenOptions | null {
  const m = NOTEBOOK_HREF.exec(href);
  if (!m) return null;
  if (m[1] === "faeden") return { view: "notes" };
  if (m[1] === "vorlagen") return { view: "templates" };
  return { noteId: m[1] ?? null };
}

// Notizbuch-Fenster über der aktuellen Seite. Jeder Link auf /notizen… öffnet es, statt die Seite zu wechseln.
export function NotebookProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [request, setRequest] = useState<NotebookRequest>({ seq: 0, noteId: null, view: null });
  // Geöffnet über die Adresse /notizen… (dann führt das Schließen zurück auf die Startseite)
  const viaRoute = useRef(false);
  const seq = useRef(0);

  const open = useCallback((opts: OpenOptions = {}) => {
    seq.current += 1;
    setRequest({ seq: seq.current, noteId: opts.noteId ?? null, view: opts.view ?? null });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    if (viaRoute.current) {
      viaRoute.current = false;
      router.replace("/");
    }
  }, [router]);

  // Links auf das Notizbuch abfangen (Menü, Notiz-Symbole, Suche, Verknüpfungen …); Strg/Cmd-Klick und neue Tabs bleiben normale Links
  useEffect(() => {
    if (!enabled) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      const opts = href ? parseNotebookHref(href) : null;
      if (!opts) return;
      e.preventDefault();
      open(opts);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [enabled, open]);

  // Wer im Buch auf eine andere Seite der App springt (Figur, Wiki, Szene), sieht diese Seite: das Buch schließt sich
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (!/^\/notizen(\/|$)/.test(pathname)) {
      viaRoute.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(false);
    }
  }, [pathname]);

  // Adresse /notizen… aufgerufen: Buch öffnen
  const openFromRoute = useCallback(
    (opts: OpenOptions) => {
      viaRoute.current = true;
      open(opts);
    },
    [open],
  );

  const value = useMemo(() => (enabled ? { open, close } : { open: (o?: OpenOptions) => window.location.assign(o?.noteId ? `/notizen/${o.noteId}` : "/notizen"), close: () => {} }), [enabled, open, close]);
  return (
    <NotebookContext.Provider value={value}>
      <RouteOpenContext.Provider value={openFromRoute}>{children}</RouteOpenContext.Provider>
      {enabled && isOpen && (
        <Suspense fallback={null}>
          <Notebook request={request} onClose={close} />
        </Suspense>
      )}
    </NotebookContext.Provider>
  );
}

const RouteOpenContext = createContext<(opts: OpenOptions) => void>(() => {});

// Inhalt der Seiten /notizen…: öffnet das Buch, sobald die Seite da ist
export function NotebookRoute({ noteId = null, view = "notes" }: { noteId?: string | null; view?: NotebookView }) {
  const openFromRoute = useContext(RouteOpenContext);
  useEffect(() => {
    openFromRoute({ noteId, view });
  }, [openFromRoute, noteId, view]);
  return <div className="min-h-[60dvh]" />;
}
