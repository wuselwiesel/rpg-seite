"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { GO_START_DONE_EVENT, GO_START_EVENT } from "@/lib/scene-nav";

// Next hält die vorige Ansicht versteckt im Hintergrund (gleiche ID zweimal): nur das sichtbare Element zählt
function visibleById(id: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(`[id="${id}"]`)).find((el) => el.offsetParent !== null) ?? null;
}

function scrollToLast() {
  visibleById("letzter-beitrag")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Springt zur letzten Nachricht der Szene. "inline": Textknopf in der Überschrift;
// "floating": schwebender Knopf, solange der letzte Beitrag noch unterhalb des sichtbaren Bereichs liegt.
export function JumpToLast({ variant }: { variant: "inline" | "floating" }) {
  const [below, setBelow] = useState(false);

  // Lage der letzten Nachricht bei jedem Scrollen frisch lesen (nicht an ein einzelnes Element gebunden: bei neuen Nachrichten wechselt das Element mit der ID,
  // ein Beobachter am alten Element blieb sonst hängen und der Knopf stand weiter da, obwohl man schon unten war)
  useEffect(() => {
    if (variant !== "floating") return;
    let pending: number | undefined;
    function update() {
      pending = undefined;
      const el = visibleById("letzter-beitrag");
      if (!el) return setBelow(false);
      const top = el.getBoundingClientRect().top;
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 80;
      setBelow(top > window.innerHeight && !atBottom);
    }
    const schedule = () => {
      if (pending === undefined) pending = window.setTimeout(update, 60);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const timer = window.setInterval(schedule, 600);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.clearInterval(timer);
      if (pending !== undefined) window.clearTimeout(pending);
    };
  }, [variant]);

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={scrollToLast}
        className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-fg-soft transition hover:text-fg active:scale-95"
      >
        <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
        Zur letzten Nachricht
      </button>
    );
  }

  if (!below) return null;
  return (
    <button
      type="button"
      onClick={scrollToLast}
      aria-label="Zur letzten Nachricht springen"
      className="menu-pop pointer-events-auto flex h-11 items-center gap-1.5 rounded-full bg-accent-strong px-4 text-sm font-medium text-on-accent-strong shadow-lg transition active:scale-95"
    >
      <ArrowDown className="h-4 w-4" strokeWidth={2.25} />
      Zur letzten Nachricht
    </button>
  );
}

// Springt zum ersten Beitrag der Szene; lange Szenen laden dafür alle früheren Beiträge nach.
export function JumpToStart() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        const done = () => {
          setBusy(false);
          window.removeEventListener(GO_START_DONE_EVENT, done);
        };
        window.addEventListener(GO_START_DONE_EVENT, done);
        window.dispatchEvent(new Event(GO_START_EVENT));
      }}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg disabled:opacity-60"
    >
      <ArrowUp className="h-4 w-4" strokeWidth={2} />
      {busy ? "Lade …" : "Zum Anfang"}
    </button>
  );
}

// Schwebender Pfeil nach oben: erscheint nur, solange man in einer langen Szene selbst nach oben scrollt (wie unten „Zur letzten Nachricht“)
// und der Anfang der Liste weit weg ist. Verschwindet beim Runterscrollen, kurz nach dem Anhalten und ganz unten. Von der Seite selbst
// ausgelöste Verschiebungen (Tastatur, neue Beiträge, Eingabefeld) zählen nicht. Lädt bei Bedarf alle früheren Beiträge nach und springt zum ersten.
export function JumpToStartFloating() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let lastInput = 0;
    let hideTimer: number | undefined;
    const touch = () => {
      lastInput = Date.now();
    };
    function hide() {
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
      hideTimer = undefined;
      setShow(false);
    }
    function onScroll() {
      const y = window.scrollY;
      const goingUp = y < lastY - 2;
      const goingDown = y > lastY + 2;
      lastY = y;
      // Next hält die vorige Ansicht versteckt im Hintergrund (gleiche ID zweimal): nur die sichtbare Liste zählt
      const list = Array.from(document.querySelectorAll<HTMLElement>("#beitragsliste")).find((el) => el.offsetParent !== null);
      const top = list?.getBoundingClientRect().top ?? 0;
      const far = top < -window.innerHeight * 0.6;
      const nearEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 400;
      if (!far || nearEnd || goingDown) return hide();
      // Nur eigenes Scrollen (Finger, Rad, Tasten, auch das Nachrollen danach) zählt, nicht Verschiebungen durch die Seite selbst
      if (goingUp && Date.now() - lastInput < 1200) {
        setShow(true);
        if (hideTimer !== undefined) window.clearTimeout(hideTimer);
        hideTimer = window.setTimeout(hide, 2500);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", touch, { passive: true });
    window.addEventListener("touchmove", touch, { passive: true });
    window.addEventListener("wheel", touch, { passive: true });
    window.addEventListener("keydown", touch);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", touch);
      window.removeEventListener("touchmove", touch);
      window.removeEventListener("wheel", touch);
      window.removeEventListener("keydown", touch);
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    };
  }, []);

  if (!show && !busy) return null;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        const done = () => {
          setBusy(false);
          setShow(false);
          window.removeEventListener(GO_START_DONE_EVENT, done);
        };
        window.addEventListener(GO_START_DONE_EVENT, done);
        window.dispatchEvent(new Event(GO_START_EVENT));
      }}
      aria-label="Zum Anfang der Szene springen"
      title="Zum Anfang der Szene"
      className={`menu-pop pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong shadow-lg transition active:scale-95 disabled:opacity-70 ${busy ? "animate-pulse" : ""}`}
    >
      <ArrowUp className="h-5 w-5" strokeWidth={2.25} />
    </button>
  );
}
