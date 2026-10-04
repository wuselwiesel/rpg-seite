"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Camera, ChevronDown, Newspaper } from "lucide-react";
import { type AppMode } from "@/lib/app-mode";
import { useAppMode } from "@/components/mode-context";

const MODES: { id: AppMode; href: string; label: string; Icon: typeof Camera }[] = [
  { id: "ingame", href: "/", label: "Ingame", Icon: Camera },
  { id: "story", href: "/story", label: "Story", Icon: BookOpen },
  { id: "redaktion", href: "/redaktion", label: "Redaktion", Icon: Newspaper },
];

export function ModeSwitch() {
  const mode = useAppMode();

  return (
    <div className="flex gap-1 rounded-xl bg-surface-2 p-1 text-sm font-medium" data-tour="mode-switch">
      {MODES.map(({ id, href, label }) => (
        <Link
          key={id}
          href={href}
          className={`flex flex-1 items-center justify-center whitespace-nowrap rounded-lg px-2 py-2 transition ${
            id === "redaktion" ? "flex-[1.35]" : ""
          } ${mode === id ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

// Handy: ein Knopf mit dem aktuellen Modus, der ein kleines Menü zum Wechseln öffnet.
export function MobileModeButton() {
  const mode = useAppMode();
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative" data-tour="mode-switch">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90"
      >
        <current.Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {current.label}
        <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 flex w-40 flex-col gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          {MODES.map(({ id, href, label, Icon }) => (
            <Link
              key={id}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === id ? "bg-surface-2 text-fg" : "text-fg-soft hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
