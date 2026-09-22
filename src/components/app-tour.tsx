"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { TOUR_START_EVENT } from "@/lib/tour";

type Match = { attr: string } | { title: string } | { name: string };
type Step = {
  title: string;
  text: string;
  route?: string;
  match?: Match;
};

const STEPS: Step[] = [
  {
    title: "Willkommen bei Wortwinkel",
    text: "Ein kurzer Rundgang durch die wichtigsten Stellen der App. Mit „Weiter“ geht's los, du kannst jederzeit abbrechen.",
    route: "/",
  },
  { title: "Feed", text: "Hier landest du: die Beiträge deiner Welt, wie bei Instagram.", route: "/", match: { name: "Feed" } },
  { title: "Suche", text: "Charaktere, Welten und Beiträge finden – auch nach Hashtags.", route: "/", match: { name: "Suche" } },
  {
    title: "Neu erstellen",
    text: "Hier schreibst du einen Beitrag – oder, in der Story, eine neue Szene.",
    route: "/",
    match: { attr: "compose" },
  },
  {
    title: "Ingame / Story",
    text: "Zwei Ansichten: „Ingame“ ist der Feed wie bei Instagram. „Story“ ist das eigentliche Rollenspiel – hier schreibt ihr gemeinsam die Handlung.",
    route: "/",
    match: { attr: "mode-switch" },
  },
  {
    title: "Wiki",
    text: "Orte, NPCs und Fraktionen eurer Welt. Namen aus dem Wiki werden im Text automatisch verlinkt.",
    route: "/story",
    match: { name: "Wiki" },
  },
  {
    title: "Beziehungen",
    text: "Das Beziehungsnetz eurer Charaktere, mit Verlauf und Stammbaum.",
    route: "/story",
    match: { name: "Beziehungen" },
  },
  {
    title: "Konto & mehr",
    text: "Freund:innen, Charaktere verwalten, Benachrichtigungen einstellen – und diesen Rundgang jederzeit wieder starten.",
    route: "/story",
    match: { attr: "account-menu" },
  },
  {
    title: "Benachrichtigungen",
    text: "Wer dran ist, wer dich erwähnt oder deinen Beitrag mag – alles landet hier.",
    route: "/story",
    match: { title: "Benachrichtigungen" },
  },
  {
    title: "Chats",
    text: "Nachrichten zwischen euren Charakteren, auch stille Gruppen und @-Erwähnungen.",
    route: "/",
    match: { name: "Chats" },
  },
  {
    title: "Das war's!",
    text: "Du findest den Rundgang jederzeit wieder über das Menü (☰ bzw. „Mehr“).",
    route: "/",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function isVisible(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

// Findet das Ziel-Element eines Schritts, ohne dass jede Nav-Stelle extra markiert werden müsste:
// über data-tour, den Titel (z. B. der Glocke) oder den sichtbaren/erreichbaren Namen (aria-label/Text).
function findTarget(match: Match): HTMLElement | null {
  if ("attr" in match) {
    const els = document.querySelectorAll<HTMLElement>(`[data-tour="${match.attr}"]`);
    return Array.from(els).find(isVisible) ?? null;
  }
  if ("title" in match) {
    const els = document.querySelectorAll<HTMLElement>(`[title="${match.title}"]`);
    return Array.from(els).find(isVisible) ?? null;
  }
  const candidates = document.querySelectorAll<HTMLElement>("a, button");
  for (const el of Array.from(candidates)) {
    const name = el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "";
    if (name === match.name && isVisible(el)) return el;
  }
  return null;
}

export function AppTour() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [searching, setSearching] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = STEPS[stepIndex];

  useEffect(() => {
    function onStart() {
      setStepIndex(0);
      setActive(true);
    }
    window.addEventListener(TOUR_START_EVENT, onStart);
    return () => window.removeEventListener(TOUR_START_EVENT, onStart);
  }, []);

  // Zielseite dieses Schritts ansteuern, falls nötig.
  useEffect(() => {
    if (!active) return;
    if (step.route && pathname !== step.route) router.push(step.route);
  }, [active, step, pathname, router]);

  // Ziel-Element suchen (mit ein paar Versuchen, falls die Seite gerade erst lädt) und Position verfolgen.
  const locate = useCallback(() => {
    if (!step.match) {
      setRect(null);
      setSearching(false);
      return;
    }
    if (step.route && pathname !== step.route) return;
    const el = findTarget(step.match);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    setSearching(false);
  }, [step, pathname]);

  useEffect(() => {
    if (!active) return;
    setRect(null);
    setSearching(true);
    locate();
    let tries = 0;
    pollTimer.current = setInterval(() => {
      tries++;
      locate();
      if (tries > 16 && pollTimer.current) {
        clearInterval(pollTimer.current);
        setSearching(false);
      }
    }, 150);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, pathname]);

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
    setActive(false);
    if (pollTimer.current) clearInterval(pollTimer.current);
  }

  function next() {
    if (stepIndex >= STEPS.length - 1) {
      close();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  if (!active) return null;

  const PAD = 8;
  const spot = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;

  // Tooltip-Position: unter dem Ziel, sonst darüber (an der Unterkante verankert, damit die Karte
  // nach oben wächst statt über den Bildschirmrand hinaus); sonst mittig (kein Ziel gefunden).
  let card: { top?: number; bottom?: number; left: number; placement: "below" | "above" | "center" };
  if (spot) {
    const width = 300;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const below = spot.top + spot.height + 210 < vh;
    const left = Math.min(Math.max(12, spot.left + spot.width / 2 - width / 2), vw - width - 12);
    card = below
      ? { top: spot.top + spot.height + 12, left, placement: "below" }
      : { bottom: Math.max(12, vh - spot.top + 12), left, placement: "above" };
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
            ? "fixed inset-x-4 top-1/2 z-10 mx-auto max-w-sm -translate-y-1/2 rounded-2xl bg-surface p-5 shadow-xl"
            : "menu-pop fixed z-10 w-[min(300px,calc(100vw-24px))] rounded-2xl bg-surface p-4 shadow-xl"
        }
        style={
          card.placement === "center"
            ? undefined
            : { left: card.left, ...(card.placement === "below" ? { top: card.top } : { bottom: card.bottom }) }
        }
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="text-xs text-muted">
            {stepIndex + 1} / {STEPS.length}
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
        <p className="mb-4 text-sm leading-relaxed text-fg-soft">
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
          <button
            type="button"
            onClick={next}
            className="flex items-center gap-1.5 rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
          >
            {stepIndex >= STEPS.length - 1 ? "Fertig" : "Weiter"}
            {stepIndex < STEPS.length - 1 && <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />}
          </button>
        </div>
      </div>
    </div>
  );
}
