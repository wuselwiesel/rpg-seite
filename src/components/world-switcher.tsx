"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Check, Settings, Compass, Plus } from "lucide-react";
import { setActiveWorld } from "@/app/worlds/actions";
import { WorldCover } from "./world-cover";
import type { World } from "@/lib/types";

export function WorldSwitcher({
  worlds,
  activeWorld,
  isOwner,
}: {
  worlds: World[];
  activeWorld: World;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-surface-2 disabled:opacity-60"
      >
        <WorldCover
          name={activeWorld.name}
          coverUrl={activeWorld.cover_image_url}
          className="h-10 w-10 shrink-0 rounded-lg text-sm"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-lg leading-tight text-fg">
            {activeWorld.name}
          </span>
          <span className="block text-xs text-muted">
            {worlds.length > 1 ? `${worlds.length} Welten` : "Welt wechseln"}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-line bg-surface shadow-lg">
          <div className="max-h-72 overflow-y-auto p-2">
            {worlds.map((w) => (
              <button
                key={w.id}
                type="button"
                disabled={isPending}
                onClick={() => {
                  setOpen(false);
                  if (w.id !== activeWorld.id) startTransition(() => setActiveWorld(w.id));
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-surface-2 disabled:opacity-60"
              >
                <WorldCover name={w.name} coverUrl={w.cover_image_url} className="h-9 w-9 shrink-0 rounded-lg text-xs" />
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{w.name}</span>
                {w.id === activeWorld.id && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-0.5 border-t border-line p-2">
            {isOwner && (
              <Link
                href={`/worlds/${activeWorld.id}/edit`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
              >
                <Settings className="h-4 w-4 shrink-0" strokeWidth={2} />
                Diese Welt bearbeiten
              </Link>
            )}
            <Link
              href="/worlds"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              <Settings className="h-4 w-4 shrink-0" strokeWidth={2} />
              Welten verwalten
            </Link>
            <Link
              href="/search?tab=worlds"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              <Compass className="h-4 w-4 shrink-0" strokeWidth={2} />
              Welten entdecken
            </Link>
            <Link
              href="/worlds/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
              Neue Welt erschaffen
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
