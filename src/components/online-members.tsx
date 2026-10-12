"use client";

import { useEffect, useRef, useState } from "react";
import { CharacterAvatar } from "@/components/character-avatar";
import { useOnline } from "@/components/online-status";

type Member = { id: string; name: string; avatarUrl: string | null };

const SHOWN = 4;

// Wer aus der Welt gerade online ist: ein kleiner grüner Punkt mit kleinen Bildern, ein Klick zeigt die Namen. Ohne andere Online-Personen erscheint nichts.
export function OnlineMembers({ members, selfId, className = "" }: { members: Member[]; selfId: string; className?: string }) {
  const { enabled, onlineIds } = useOnline();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const online = enabled ? members.filter((m) => m.id !== selfId && onlineIds.has(m.id)) : [];
  if (online.length === 0) return null;
  const rest = online.length - SHOWN;

  return (
    <div ref={ref} className={className}>
      <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Online: ${online.map((m) => m.name).join(", ")}`}
        title={`Online: ${online.map((m) => m.name).join(", ")}`}
        className="flex items-center gap-1.5 rounded-full px-1.5 py-1 text-[11px] text-muted transition hover:bg-surface-2"
      >
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        <span className="flex -space-x-1.5">
          {online.slice(0, SHOWN).map((m) => (
            <span key={m.id} className="rounded-full ring-2 ring-app">
              <CharacterAvatar name={m.name} avatarUrl={m.avatarUrl} size={20} />
            </span>
          ))}
        </span>
        {rest > 0 && <span>+{rest}</span>}
      </button>
      {open && (
        <ul className="absolute right-0 top-full z-20 mt-1 min-w-36 max-w-60 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          {online.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-fg">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate">{m.name}</span>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}

// Punkt für den Schreibbereich: grün, wenn jemand aus der Welt online ist, sonst grau. Ein Klick zeigt, wer online (und wer offline) ist.
export function OnlineLine({ members, selfId, className = "" }: { members: Member[]; selfId: string; className?: string }) {
  const { enabled, onlineIds } = useOnline();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!enabled) return null;
  const others = members.filter((m) => m.id !== selfId);
  if (others.length === 0) return null;
  const online = others.filter((m) => onlineIds.has(m.id));
  const offline = others.filter((m) => !onlineIds.has(m.id));
  const label = online.length > 0 ? `Online: ${online.map((m) => m.name).join(", ")}` : "Niemand online";

  return (
    <div ref={ref} className={`relative w-fit ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-surface-2"
      >
        <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${online.length > 0 ? "bg-emerald-500" : "bg-fg/30"}`} />
      </button>
      {open && (
        <ul className="absolute bottom-full right-0 z-20 mb-1 max-h-64 min-w-40 max-w-64 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          {online.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-fg">
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate">{m.name}</span>
            </li>
          ))}
          {offline.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted">
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-fg/30" />
              <span className="truncate">{m.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
