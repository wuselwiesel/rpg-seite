"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronRight, X } from "lucide-react";
import { TOUR_START_EVENT, markTourDone, readToursDone } from "@/lib/tour";
import { TOURS, getTour, type TourMatch } from "@/lib/tours";

type Rect = { top: number; left: number; width: number; height: number };

// Dinge, die erst auf einer Seite gefunden werden müssen (erste Szene, ChaBo/Profil des aktiven Charakters, erster Chat)
type Refs = { thread: string | null; chabo: string | null; profile: string | null; chat: string | null };
const NO_REFS: Refs = { thread: null, chabo: null, profile: null, chat: null };

function isVisible(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

// Findet das Ziel-Element eines Schritts, ohne dass jede Nav-Stelle extra markiert werden müsste:
// über data-tour, den Titel (z. B. der Glocke), den Link-Zielpfad oder den sichtbaren Namen (aria-label/Text).
function findTarget(match: TourMatch): HTMLElement | null {
  if ("attr" in match) {
    const els = document.querySelectorAll<HTMLElement>(`[data-tour="${match.attr}"]`);
    return Array.from(els).find(isVisible) ?? null;
  }
  if ("title" in match) {
    const els = document.querySelectorAll<HTMLElement>(`[title="${match.title}"]`);
    return Array.from(els).find(isVisible) ?? null;
  }
  if ("href" in match) {
    const els = document.querySelectorAll<HTMLElement>(`a[href="${match.href}"]`);
    return Array.from(els).find(isVisible) ?? null;
  }
  const candidates = document.querySelectorAll<HTMLElement>("a, button");
  for (const el of Array.from(candidates)) {
    const name = el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "";
    if (name === match.name && isVisible(el)) return el;
  }
  return null;
}

function hrefOf(selector: string, pattern?: RegExp): string | null {
  for (const link of Array.from(document.querySelectorAll<HTMLAnchorElement>(selector))) {
    const href = link.getAttribute("href");
    if (href && (!pattern || pattern.test(href))) return href;
  }
  return null;
}

// Was sich auf der aktuellen Seite an Zielen für die Platzhalter-Routen finden lässt. Das Profil des aktiven Charakters
// leitet sich aus seinem ChaBo-Link ab: Andere Links auf Charaktere (Beiträge, Follower …) dürfen nicht dafür gelten.
function scanRefs(): Partial<Refs> {
  const found: Partial<Refs> = {};
  const thread = hrefOf('[data-tour="story-list"] a[href^="/story/"]');
  if (thread) found.thread = thread;
  const chabo = hrefOf('a[href$="/chabo"]', /^\/characters\/[0-9a-f-]{36}\/chabo$/);
  if (chabo) {
    found.chabo = chabo;
    found.profile = chabo.replace(/\/chabo$/, "");
  }
  const chat = hrefOf('a[href^="/chats/"]', /^\/chats\/[0-9a-f-]{36}/);
  if (chat) found.chat = chat;
  return found;
}

// Platzhalter ("@thread", "@chabo", "@profile", "@chat") werden zur gefundenen Seite; "@platzhalter|/seite" springt zunächst
// auf /seite, wo er sich finden lässt. Eine feste Route bleibt, wie sie ist.
function resolveRoute(route: string | undefined, refs: Refs): string | null {
  if (!route) return null;
  const [token, fallback] = route.split("|");
  if (!token.startsWith("@")) return token;
  const key = token.slice(1) as keyof Refs;
  return refs[key] ?? fallback ?? null;
}

export function AppTour() {
  // Auswahl aller Rundgänge, einzelner Rundgang oder nichts
  const [view, setView] = useState<"closed" | "list" | "tour">("closed");
  const [tourId, setTourId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [rect, setRect] = useState<Rect | null>(null);
  const [searching, setSearching] = useState(true);
  const [refs, setRefs] = useState<Refs>(NO_REFS);
  const pathname = usePathname();
  const router = useRouter();
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Seitenwechsel pro Schritt begrenzen, damit der Rundgang nie endlos zwischen Seiten springt
  const pushes = useRef(0);
  // Schritt, für den schon einmal zum Ziel gescrollt wurde
  const scrolledFor = useRef<string | null>(null);

  const tour = tourId ? getTour(tourId) : undefined;
  const active = view === "tour" && !!tour;
  const step = tour?.steps[stepIndex];

  useEffect(() => {
    function onStart(e: Event) {
      const id = (e as CustomEvent<{ id: string | null }>).detail?.id ?? null;
      setDone(readToursDone());
      setRefs(NO_REFS);
      setStepIndex(0);
      scrolledFor.current = null;
      if (id && getTour(id)) {
        setTourId(id);
        setView("tour");
      } else {
        setTourId(null);
        setView("list");
      }
    }
    window.addEventListener(TOUR_START_EVENT, onStart);
    return () => window.removeEventListener(TOUR_START_EVENT, onStart);
  }, []);

  // Während des Rundgangs die weiche Seitenüberblendung abschalten: Sie lässt bei den
  // automatischen Sprüngen sonst kurz ein weißes Zwischenbild aufblitzen.
  useEffect(() => {
    document.documentElement.classList.toggle("tour-active", view !== "closed");
    return () => document.documentElement.classList.remove("tour-active");
  }, [view]);

  // Escape schließt
  useEffect(() => {
    if (view === "closed") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setView("closed");
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view]);

  // Zielseite dieses Schritts ansteuern, falls nötig.
  useEffect(() => {
    if (!active || !step) return;
    const target = resolveRoute(step.route, refs);
    if (target && pathname !== target && pushes.current < 4) {
      pushes.current += 1;
      router.push(target);
    }
  }, [active, step, pathname, router, refs]);

  // Ziel-Element suchen (mit ein paar Versuchen, falls die Seite gerade erst lädt) und Position verfolgen.
  const locate = useCallback(() => {
    if (!step) return;
    // Auf jeder Seite merken, was sich für die Platzhalter-Routen findet.
    // Ein einmal gefundener Wert bleibt für den ganzen Rundgang stehen: Wechselte er mit jeder Seite, könnte der Rundgang
    // zwischen zwei Seiten hin- und herspringen.
    const found = scanRefs();
    const fresh = (Object.keys(found) as (keyof Refs)[]).filter((k) => !refs[k]);
    if (fresh.length > 0) setRefs((prev) => ({ ...prev, ...Object.fromEntries(fresh.filter((k) => !prev[k]).map((k) => [k, found[k]])) }));

    if (!step.match) {
      setRect(null);
      setSearching(false);
      return;
    }
    const target = resolveRoute(step.route, { ...found, ...Object.fromEntries(Object.entries(refs).filter(([, v]) => v)) } as Refs);
    if (target && pathname !== target) return;
    const el = findTarget(step.match);
    if (!el) {
      setRect(null);
      return;
    }
    // Ein Ziel innerhalb einer Seite kann außerhalb des sichtbaren Bereichs liegen – dann einmal pro Schritt dorthin scrollen.
    // Nur einmal: Ist das Ziel höher als der Bildschirm (z. B. das Schreibfeld), bliebe die Bedingung sonst immer wahr, jedes Scrollen
    // löste eine neue Suche mit erneutem Scrollen aus, und der Rundgang hing in einer Endlosschleife.
    const before = el.getBoundingClientRect();
    const key = `${tourId}:${stepIndex}`;
    if (scrolledFor.current !== key && (before.bottom < 60 || before.top > window.innerHeight - 60 || before.top < 0)) {
      scrolledFor.current = key;
      el.scrollIntoView({ block: before.height > window.innerHeight - 160 ? "start" : "center", behavior: "instant" as ScrollBehavior });
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    setSearching(false);
  }, [step, pathname, refs, tourId, stepIndex]);

  useEffect(() => {
    if (!active) return;
    pushes.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Zielelement neu suchen, sobald sich der Tour-Schritt ändert
    setRect(null);
    setSearching(true);
    locate();
    let tries = 0;
    pollTimer.current = setInterval(() => {
      tries++;
      locate();
      if (tries > 40 && pollTimer.current) {
        clearInterval(pollTimer.current);
        setSearching(false);
      }
    }, 150);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tourId, stepIndex, pathname]);

  useEffect(() => {
    if (!active || !rect) return;
    function onUpdate() {
      locate();
    }
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);
    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
    };
  }, [active, rect, locate]);

  function close() {
    setView("closed");
    if (pollTimer.current) clearInterval(pollTimer.current);
  }

  function openTour(id: string) {
    scrolledFor.current = null;
    setRefs(NO_REFS);
    setStepIndex(0);
    setTourId(id);
    setView("tour");
  }

  function backToList() {
    if (pollTimer.current) clearInterval(pollTimer.current);
    setDone(readToursDone());
    setTourId(null);
    setView("list");
  }

  function next() {
    if (!tour) return;
    if (stepIndex >= tour.steps.length - 1) {
      setDone(markTourDone(tour.id));
      close();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  if (view === "closed") return null;

  if (view === "list" || !tour || !step) {
    return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Rundgänge" onClick={close}>
        <div
          className="menu-pop flex max-h-[88dvh] w-full max-w-lg flex-col rounded-2xl bg-surface shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
            <h2 className="font-serif text-2xl text-fg">Rundgänge</h2>
            <button type="button" onClick={close} aria-label="Schließen" className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          <ul className="flex flex-col gap-1 overflow-y-auto overscroll-contain px-3 pb-4">
            {TOURS.map((t) => {
              const seen = done.includes(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openTour(t.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-surface-2"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${seen ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-transparent"}`}
                      aria-label={seen ? "Schon gesehen" : undefined}
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-lg leading-snug text-fg">{t.title}</span>
                      <span className="block text-sm text-fg-soft">{t.summary}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{t.steps.length} Schritte</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  const PAD = 8;
  const spot = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;
  const last = stepIndex >= tour.steps.length - 1;

  // Tooltip-Position: unter dem Ziel, sonst darüber; passt die Karte an keine der beiden Stellen (Ziel höher als der Bildschirm, z. B. das
  // Schreibfeld auf einem kleinen Fenster), steht sie fest am unteren Rand über dem Ziel – sonst läge sie außerhalb und „Weiter“ wäre
  // nicht erreichbar. Ohne Ziel mittig.
  const CARD_H = 280;
  let card: { top?: number; bottom?: number; left: number; placement: "below" | "above" | "pinned" | "center" };
  if (spot) {
    const width = 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(12, spot.left + spot.width / 2 - width / 2), vw - width - 12);
    const spaceBelow = vh - (spot.top + spot.height);
    const spaceAbove = spot.top;
    if (spaceBelow >= CARD_H) card = { top: spot.top + spot.height + 12, left, placement: "below" };
    else if (spaceAbove >= CARD_H) card = { bottom: vh - spot.top + 12, left, placement: "above" };
    else card = { bottom: 12, left, placement: "pinned" };
  } else {
    card = { left: 0, placement: "center" };
  }

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Abdunklung: entweder vier Bänder um das Ziel herum, oder eine volle Fläche ohne Ziel. */}
      {spot ? (
        <>
          <div className="fixed bg-black/60 transition-all" style={{ top: 0, left: 0, right: 0, height: Math.max(0, spot.top) }} />
          <div className="fixed bg-black/60 transition-all" style={{ top: spot.top + spot.height, left: 0, right: 0, bottom: 0 }} />
          <div className="fixed bg-black/60 transition-all" style={{ top: spot.top, left: 0, width: Math.max(0, spot.left), height: spot.height }} />
          <div className="fixed bg-black/60 transition-all" style={{ top: spot.top, left: spot.left + spot.width, right: 0, height: spot.height }} />
          <div
            className="pointer-events-none fixed rounded-xl ring-2 ring-accent-strong transition-all"
            style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}

      <div
        className={
          card.placement === "center"
            ? "fixed inset-x-4 top-1/2 z-10 mx-auto max-w-md -translate-y-1/2 rounded-2xl bg-surface p-5 shadow-xl"
            : "menu-pop fixed z-10 w-[min(320px,calc(100vw-24px))] rounded-2xl bg-surface p-4 shadow-xl"
        }
        style={
          card.placement === "center"
            ? undefined
            : { left: card.left, ...(card.placement === "below" ? { top: card.top } : { bottom: card.bottom }) }
        }
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-xs text-muted">
            {tour.title} · {stepIndex + 1} / {tour.steps.length}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Rundgang beenden"
            className="rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <h2 className="mb-1.5 font-serif text-xl text-fg">{step.title}</h2>
        <p className="mb-4 max-h-[40dvh] overflow-y-auto text-sm leading-relaxed text-fg-soft">
          {step.text}
          {!rect && step.match && !searching && (
            <span className="mt-1 block text-xs text-muted">(Nicht auf diesem Bildschirm sichtbar – gilt trotzdem.)</span>
          )}
        </p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={back}
            disabled={stepIndex === 0}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:bg-surface-2 disabled:opacity-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Zurück
          </button>
          <div className="flex items-center gap-2">
            {last && (
              <button
                type="button"
                onClick={() => {
                  setDone(markTourDone(tour.id));
                  backToList();
                }}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:bg-surface-2"
              >
                Alle Rundgänge
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1.5 rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
            >
              {last ? "Fertig" : "Weiter"}
              {!last && <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
