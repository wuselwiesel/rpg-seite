"use client";

import { useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";

// "Personen markieren" wie bei Instagram: Charaktere auswählen, die im Beitrag vorkommen.
export function TagPeople({ people, name = "tagged_character_id" }: { people: Character[]; name?: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  if (people.length === 0) return null;
  const chosen = people.filter((p) => selected.includes(p.id));
  const q = query.trim().toLowerCase();
  const matches = people.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.username ?? "").toLowerCase().includes(q));

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 20)));
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left text-sm text-fg"
      >
        <UserPlus className="h-4 w-4 text-fg-soft" strokeWidth={2} />
        <span className="flex-1">Personen markieren</span>
        {chosen.length > 0 && <span className="text-xs text-muted">{chosen.length} markiert</span>}
      </button>

      {chosen.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chosen.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-1 pr-2 text-xs text-fg">
              <CharacterAvatar name={p.name} avatarUrl={p.avatar_url} size={20} />
              {p.username ?? p.name}
              <button type="button" onClick={() => toggle(p.id)} aria-label={`${p.name} entfernen`} className="text-muted hover:text-fg">
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5">
            <Search className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Charakter suchen"
              className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none sm:text-sm"
            />
          </label>
          <ul className="max-h-56 overflow-y-auto">
            {matches.map((p) => {
              const on = selected.includes(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-pressed={on}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-2"
                  >
                    <CharacterAvatar name={p.name} avatarUrl={p.avatar_url} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-fg">{p.username ?? p.name}</span>
                      {p.username && <span className="block truncate text-xs text-muted">{p.name}</span>}
                    </span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                        on ? "border-transparent bg-accent-strong text-on-accent-strong" : "border-line text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                </li>
              );
            })}
            {matches.length === 0 && <li className="px-2 py-3 text-sm text-muted">Niemand gefunden.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
