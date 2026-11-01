"use client";

import { CustomEmojiPicker } from "@/components/custom-emoji-picker";
import { WIKI_ICON_LIBRARY } from "@/components/wiki-icon";

// Auswahl eines Symbols: Raster mit Symbolen aus der Bibliothek, dazu jedes Emoji (auch eigene der Welt).
export function IconPicker({ value, onChange, colorHex, className = "" }: { value: string; onChange: (value: string) => void; colorHex?: string | null; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div role="group" aria-label="Symbol wählen" className="grid max-h-40 grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1 overflow-y-auto rounded-lg border border-line bg-app p-1.5">
        {WIKI_ICON_LIBRARY.map(({ name, label, Icon }) => (
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
