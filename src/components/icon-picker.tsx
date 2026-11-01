"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { CustomEmojiPicker } from "@/components/custom-emoji-picker";
import { WIKI_ICON_GROUPS, WIKI_ICON_LIBRARY } from "@/components/wiki-icon";

const norm = (s: string) => s.toLocaleLowerCase("de").normalize("NFD").replace(/\p{M}/gu, "");

// Auswahl eines Symbols: Suche und Kategorien über die Symbolbibliothek, dazu jedes Emoji (auch eigene der Welt).
export function IconPicker({ value, onChange, colorHex, className = "" }: { value: string; onChange: (value: string) => void; colorHex?: string | null; className?: string }) {
  const [group, setGroup] = useState<string>("");
  const [query, setQuery] = useState("");
  const q = norm(query.trim());
  const shown = WIKI_ICON_LIBRARY.filter((i) => (!group || i.group === group) && (!q || norm(i.label).includes(q) || norm(i.group).includes(q) || i.name.includes(q)));
  const chip = (on: boolean) => `shrink-0 rounded-full px-2.5 py-1 text-xs transition ${on ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="relative block">
        <span className="sr-only">Symbol suchen</span>
        <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          placeholder="Symbol suchen"
          className="w-full rounded-lg border border-line bg-app py-2 pl-8 pr-3 text-sm text-fg outline-none focus:border-accent"
        />
      </label>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Kategorie">
        <button type="button" onClick={() => setGroup("")} aria-pressed={group === ""} className={chip(group === "")}>
          Alle
        </button>
        {WIKI_ICON_GROUPS.map((g) => (
          <button key={g} type="button" onClick={() => setGroup(g)} aria-pressed={group === g} className={chip(group === g)}>
            {g}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Symbol wählen" className="grid max-h-56 grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1 overflow-y-auto rounded-lg border border-line bg-app p-1.5">
        {shown.map(({ name, label, Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            aria-pressed={value === name}
            aria-label={label}
            title={label}
            className={`flex h-9 w-full items-center justify-center rounded-md transition ${value === name ? "bg-accent/15 ring-2 ring-accent" : "text-fg-soft hover:bg-surface-2 hover:text-fg"}`}
          >
            <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} style={value === name && colorHex ? { color: colorHex } : undefined} />
          </button>
        ))}
        {shown.length === 0 && <p className="col-span-full px-2 py-3 text-center text-sm text-muted">Kein Symbol gefunden.</p>}
      </div>
      <CustomEmojiPicker
        direction="down"
        label="Emoji wählen"
        onPick={(token) => onChange(token.trim().slice(0, 40))}
        className="flex h-9 w-fit items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
      />
    </div>
  );
}
