"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";

export type CastOption = { id: string; name: string; avatar_url: string | null | undefined };

// Charaktere auswählen: gewählte als Chips (mit ✕), darunter ein Suchfeld mit Vorschlägen. Die Reihenfolge der Optionen bestimmt die Vorschläge.
export function CastPicker({
  options,
  value,
  onChange,
  inputName,
  placeholder = "Charakter suchen …",
}: {
  options: CastOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  // Mit Namen werden die Auswahl als versteckte Felder mitgeschickt (für Formulare)
  inputName?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  const chosen = value.map((id) => options.find((o) => o.id === id)).filter((o): o is CastOption => !!o);
  const q = query.trim().toLowerCase();
  const matches = options.filter((o) => !value.includes(o.id) && (!q || o.name.toLowerCase().includes(q))).slice(0, 8);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function add(id: string) {
    onChange([...value, id]);
    setQuery("");
    setActive(0);
  }

  return (
    <div ref={ref} className="flex flex-col gap-2">
      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chosen.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5 rounded-full bg-accent-strong py-1 pl-1 pr-1.5 text-sm text-on-accent-strong">
              <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={22} />
              {c.name}
              <button type="button" onClick={() => onChange(value.filter((id) => id !== c.id))} aria-label={`${c.name} entfernen`} className="rounded-full p-0.5 opacity-80 transition hover:opacity-100">
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}
      {inputName && value.map((id) => <input key={id} type="hidden" name={inputName} value={id} />)}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              // Enter wählt den markierten Vorschlag (und schickt das Formular nicht ab)
              if (open && matches[active]) {
                e.preventDefault();
                add(matches[active].id);
              } else if (open) e.preventDefault();
            } else if (e.key === "Escape") setOpen(false);
            else if (e.key === "Backspace" && !query && value.length) onChange(value.slice(0, -1));
          }}
          placeholder={placeholder}
          aria-label="Charakter suchen"
          autoComplete="off"
          role="combobox"
          aria-controls={listId}
          aria-expanded={open && matches.length > 0}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
        />
        {open && matches.length > 0 && (
          <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lg">
            {matches.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => add(c.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-fg ${i === active ? "bg-surface-2" : ""}`}
                >
                  <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={24} />
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && q && matches.length === 0 && (
          <p className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted shadow-lg">Kein Charakter gefunden.</p>
        )}
      </div>
    </div>
  );
}
