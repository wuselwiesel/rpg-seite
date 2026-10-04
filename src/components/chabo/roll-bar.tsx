"use client";

import { Dices, Undo2 } from "lucide-react";

// Stil-Schalter, Würfel-Knopf und „Rückgängig“ in der Kopfzeile von Attribute und Talente (nur im Bearbeiten).
export function RollBar<T extends string>({
  label,
  options,
  value,
  onStyle,
  onRoll,
  onUndo,
  canUndo,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onStyle: (id: T) => void;
  onRoll: () => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      <div className="flex rounded-lg bg-surface-2 p-0.5" role="radiogroup" aria-label={`Stil ${label}`}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onStyle(o.id)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${value === o.id ? "bg-surface font-medium text-fg shadow-sm" : "text-fg-soft hover:text-fg"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onRoll}
        aria-label={`${label} würfeln`}
        className="flex items-center gap-1.5 rounded-lg bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
      >
        <Dices className="h-4 w-4" strokeWidth={2} />
        Würfeln
      </button>
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={`${label} rückgängig`}
        className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-fg-soft transition hover:text-fg disabled:opacity-40"
      >
        <Undo2 className="h-4 w-4" strokeWidth={2} />
        Rückgängig
      </button>
    </div>
  );
}
