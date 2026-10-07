"use client";

import Link from "next/link";
import { BookOpen, Camera, Newspaper } from "lucide-react";
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

// Handy: drei Segmente, der aktive Modus mit Beschriftung, die anderen nur als Symbol – ein Tipp zum Wechseln.
export function MobileModeButton() {
  const mode = useAppMode();

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-surface-2 p-0.5" data-tour="mode-switch" role="group" aria-label="Modus">
      {MODES.map(({ id, href, label, Icon }) => {
        const active = mode === id;
        return (
          <Link
            key={id}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`flex h-8 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-all ${
              active ? "bg-accent-strong px-3 text-on-accent-strong shadow-sm" : "w-8 text-muted hover:text-fg"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            {active && label}
          </Link>
        );
      })}
    </div>
  );
}
