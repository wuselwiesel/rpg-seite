"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { setActiveWorld } from "@/app/worlds/actions";

// Unauffälliger Weltwechsel in der Wiki-Kopfzeile: nur der Name der Welt, die Liste klappt bei Klick auf.
export function WikiWorldMenu({ worlds, activeId }: { worlds: { id: string; name: string }[]; activeId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const active = worlds.find((w) => w.id === activeId);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Welt wechseln"
        className="flex max-w-[16rem] items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-60"
      >
        <span className="truncate">{active?.name ?? "Welt"}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-40 mt-1 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
          {worlds.map((w) => (
            <button
              key={w.id}
              role="menuitemradio"
              aria-checked={w.id === activeId}
              type="button"
              onClick={() => {
                setOpen(false);
                if (w.id !== activeId) start(() => setActiveWorld(w.id, "/wiki"));
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg transition hover:bg-surface-2"
            >
              <span className="min-w-0 flex-1 truncate">{w.name}</span>
              {w.id === activeId && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />}
            </button>
          ))}
          <Link href="/worlds" onClick={() => setOpen(false)} className="block border-t border-line px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-fg">
            Welten verwalten
          </Link>
        </div>
      )}
    </div>
  );
}
