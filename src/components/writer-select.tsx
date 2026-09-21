"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";

// Kleine, dezente Auswahl des eigenen Charakters, mit dem geschrieben wird ("Du schreibst als …").
// Bewusst kein natives Auswahlfeld: Auf dem iPhone würde dessen Mindestschrift (16 px) die Zeile groß machen.
export function WriterSelect({
  characters,
  value,
  onChange,
  label = "Du schreibst als",
}: {
  characters: Character[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = characters.find((c) => c.id === value) ?? characters[0];

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  if (!selected) return null;

  if (characters.length < 2) {
    return (
      <p className="flex w-fit max-w-full items-center gap-1.5 text-xs text-muted">
        <CharacterAvatar name={selected.name} avatarUrl={selected.avatar_url} size={20} />
        {label} <span className="truncate text-[13px] font-medium text-fg-soft">{selected.name}</span>
      </p>
    );
  }

  return (
    <div ref={ref} className="relative w-fit max-w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selected.name}`}
        className="flex max-w-full items-center gap-1.5 rounded-full py-1 pr-2 text-xs text-muted transition hover:text-fg-soft active:opacity-70"
      >
        <CharacterAvatar name={selected.name} avatarUrl={selected.avatar_url} size={20} />
        <span className="shrink-0">{label}</span>
        <span className="truncate text-[13px] font-medium text-fg-soft">{selected.name}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="menu-pop absolute left-0 top-full z-30 mt-1 max-h-64 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lg"
        >
          {characters.map((c) => (
            <li key={c.id} role="option" aria-selected={c.id === selected.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-fg transition hover:bg-surface-2 active:bg-surface-3"
              >
                <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={28} />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                {c.id === selected.id && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
