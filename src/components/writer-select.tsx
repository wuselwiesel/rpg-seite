"use client";

import { ChevronDown } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";

// Wählt den eigenen Charakter, mit dem geschrieben wird. Groß und eindeutig, damit man nicht versehentlich
// als der falsche Charakter schreibt.
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
  const selected = characters.find((c) => c.id === value) ?? characters[0];
  if (!selected) return null;

  return (
    <label className="flex w-fit max-w-full items-center gap-1.5 text-xs text-muted">
      <CharacterAvatar name={selected.name} avatarUrl={selected.avatar_url} size={20} />
      <span className="shrink-0">{label}</span>
      {characters.length > 1 ? (
        <span className="relative min-w-0">
          <select
            value={selected.id}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="w-full min-w-0 cursor-pointer appearance-none truncate rounded bg-transparent py-1 pl-0.5 pr-5 text-sm font-medium text-fg-soft outline-none focus:ring-2 focus:ring-accent/40"
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-0.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" strokeWidth={2} />
        </span>
      ) : (
        <span className="truncate text-sm font-medium text-fg-soft">{selected.name}</span>
      )}
    </label>
  );
}
