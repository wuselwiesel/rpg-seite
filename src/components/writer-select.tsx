"use client";

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
    <label className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2">
      <CharacterAvatar name={selected.name} avatarUrl={selected.avatar_url} size={36} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-muted">{label}</span>
        {characters.length > 1 ? (
          <select
            value={selected.id}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="-ml-1 w-full min-w-0 cursor-pointer truncate rounded bg-transparent py-0.5 pl-1 text-base font-medium text-fg outline-none focus:ring-2 focus:ring-accent/40"
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="truncate text-base font-medium text-fg">{selected.name}</span>
        )}
      </span>
    </label>
  );
}
