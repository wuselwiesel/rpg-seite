"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { GO_START_DONE_EVENT, GO_START_EVENT } from "@/lib/scene-nav";

function scrollToLast() {
  document.getElementById("letzter-beitrag")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Springt zur letzten Nachricht der Szene. "inline": Textknopf in der Überschrift;
// "floating": schwebender Knopf, solange der letzte Beitrag noch unterhalb des sichtbaren Bereichs liegt.
export function JumpToLast({ variant }: { variant: "inline" | "floating" }) {
  const [below, setBelow] = useState(false);

  useEffect(() => {
    if (variant !== "floating") return;
    const el = document.getElementById("letzter-beitrag");
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      setBelow(!entry.isIntersecting && entry.boundingClientRect.top > (entry.rootBounds?.height ?? window.innerHeight));
    });
    observer.observe(el);
    return () => observer.disconnect();
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

// Schwebender Pfeil nach oben: erscheint, sobald man in einer langen Szene nach oben scrollt (wie unten „Zur letzten Nachricht“)
// und der Anfang der Liste weit weg ist. Lädt bei Bedarf alle früheren Beiträge nach und springt zum ersten.
export function JumpToStartFloating() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      const goingUp = y < lastY - 2;
      const goingDown = y > lastY + 2;
      lastY = y;
      const top = document.getElementById("beitragsliste")?.getBoundingClientRect().top ?? 0;
      const far = top < -window.innerHeight * 0.6;
      if (!far) setShow(false);
      else if (goingUp) setShow(true);
      else if (goingDown) setShow(false);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
