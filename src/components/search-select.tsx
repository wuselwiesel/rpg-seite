"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";

export type SearchSelectOption = {
  value: string;
  label: string;
  // Zusatz hinter dem Namen (z. B. Spieler:in), wird auch durchsucht
  hint?: string;
  // Mit Bild (auch ohne Adresse: dann Anfangsbuchstabe) für Charaktere
  avatar?: boolean;
  avatarUrl?: string | null;
  // Zwischenüberschrift, sobald sie wechselt
  group?: string;
};

// Auswahlfeld mit Suche (Ersatz für ein <select>, vor allem für Charaktere): Klick öffnet eine Liste mit Suchfeld.
// Mit `name` wird der Wert als verstecktes Feld mitgeschickt (Formulare, auch GET). Ohne `value` verwaltet das Feld sich selbst (`defaultValue`).
// `emptyOption` ist der Eintrag für „nichts gewählt“ (Wert „“); ohne ihn ist automatisch der erste Eintrag gewählt wie bei einem <select>.
export function SearchSelect({
  options,
  value,
  defaultValue = "",
  onChange,
  name,
  emptyOption,
  ariaLabel,
  placeholder = "Suchen …",
  className = "",
  disabled,
  align = "left",
}: {
  options: SearchSelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  emptyOption?: string;
  ariaLabel: string;
  placeholder?: string;
  // Aussehen des Feldes (wie bisher beim <select>)
  className?: string;
  disabled?: boolean;
  align?: "left" | "right";
}) {
  const [inner, setInner] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const raw = value ?? inner;
  const known = options.some((o) => o.value === raw);
  const current = known ? raw : emptyOption !== undefined ? "" : (options[0]?.value ?? "");
  const selected = options.find((o) => o.value === current);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q)) : options;
    return emptyOption !== undefined && !q ? [{ value: "", label: emptyOption } as SearchSelectOption, ...list] : list;
  }, [options, query, emptyOption]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function openList() {
    setQuery("");
    const i = items.findIndex((o) => o.value === current);
    setActive(Math.max(0, i));
    setOpen(true);
  }

  function pick(v: string) {
    if (value === undefined) setInner(v);
    onChange?.(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = items[active];
      if (o) pick(o.value);
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      {name && <input type="hidden" name={name} value={current} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`flex w-full min-w-0 items-center justify-between gap-2 text-left disabled:opacity-60 ${className}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.avatar && <CharacterAvatar name={selected.label} avatarUrl={selected.avatarUrl} size={20} />}
          <span className="truncate">{selected ? selected.label : (emptyOption ?? "")}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <div className={`absolute top-full z-50 mt-1 w-full min-w-[14rem] max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-2 shadow-lg ${align === "right" ? "right-0" : "left-0"}`}>
          <label className="mb-1.5 flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 text-muted focus-within:border-accent">
            <Search className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              aria-label={`${ariaLabel}: suchen`}
              className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-muted"
            />
          </label>
          <ul ref={listRef} id={listId} role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto">
            {items.length === 0 && <li className="px-2 py-2 text-sm text-muted">Nichts gefunden.</li>}
            {items.map((o, i) => {
              const showGroup = o.group && o.group !== items[i - 1]?.group;
              return (
                <li key={`${o.value}-${i}`} role="presentation">
                  {showGroup && <p className="px-2 pb-0.5 pt-2 text-xs font-medium text-muted">{o.group}</p>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === current}
                    data-active={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o.value)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-fg ${i === active ? "bg-surface-2" : ""}`}
                  >
                    {o.avatar && <CharacterAvatar name={o.label} avatarUrl={o.avatarUrl} size={24} />}
                    <span className="min-w-0 flex-1 truncate">
                      {o.label}
                      {o.hint && <span className="text-muted"> ({o.hint})</span>}
                    </span>
                    {o.value === current && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
