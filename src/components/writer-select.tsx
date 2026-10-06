"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";
import { cycleId, filterByName } from "@/lib/writer-shortcuts";

const RECENT_KEY = "wortwinkel:writer-recent";
const MAX_RECENT = 12;

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// Kleine, dezente Auswahl des eigenen Charakters, mit dem geschrieben wird ("Du schreibst als …").
// Bewusst kein natives Auswahlfeld: Auf dem iPhone würde dessen Mindestschrift (16 px) die Zeile groß machen.
export function WriterSelect({
  characters,
  value,
  onChange,
  label = "Du schreibst als",
  shortcuts = false,
}: {
  characters: Character[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  // Tastenkürzel (Mac: ⌥ statt Alt, ⌘ statt Strg):
  // Alt+0 = der davor Benutzte, Strg+K = Schnellsuche, Alt+, / Alt+. = vorheriger/nächster Charakter (zusätzlich Strg+Alt+↑/↓)
  shortcuts?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = characters.find((c) => c.id === value) ?? characters[0];
  // Zuletzt benutzte Charaktere (zuerst der neueste), gemerkt im Browser und für alle Szenen gemeinsam
  const [recent, setRecent] = useState<string[]>([]);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Browser-Speicher ist erst nach dem Hydrieren lesbar */
    setRecent(readRecent());
    setIsMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function pick(id: string) {
    onChange(id);
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* egal */
      }
      return next;
    });
  }

  // Feste Reihenfolge: Charaktere, dann NPCs, so wie sie angelegt wurden
  const fixedOrder = useMemo(() => [...characters.filter((c) => !c.is_npc), ...characters.filter((c) => c.is_npc)], [characters]);
  const rank = (id: string) => {
    const i = recent.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const byRecent = (list: Character[]) => [...list].sort((a, b) => rank(a.id) - rank(b.id));
  // Vorletzter benutzter Charakter, der noch zur Auswahl steht (Alt+0)
  const previousId = recent.find((id) => id !== selected?.id && characters.some((c) => c.id === id)) ?? null;

  useEffect(() => {
    if (!shortcuts || characters.length < 2) return;
    function onKey(e: KeyboardEvent) {
      // Strg/⌘+K: Schnellsuche
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.code === "KeyK") {
        e.preventDefault();
        setQuickOpen(true);
        return;
      }
      // Alt+, (zurück) und Alt+. (weiter): durch die Charaktere schalten; zusätzlich Strg+Alt+↑/↓ (Mac: ⌃⌥ oder ⌘⌥)
      const arrow = (e.ctrlKey || e.metaKey) && e.altKey && !(e.ctrlKey && e.metaKey) && !e.shiftKey && (e.code === "ArrowUp" || e.code === "ArrowDown");
      const comma = e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.code === "Comma" || e.code === "Period");
      if (arrow || comma) {
        const forward = e.code === "ArrowDown" || e.code === "Period";
        const target = cycleId(fixedOrder.map((c) => c.id), selected?.id, forward ? 1 : -1);
        if (target && target !== selected?.id) {
          e.preventDefault();
          pick(target);
        }
        return;
      }
      // Alt+0: zurück zum zuletzt davor benutzten Charakter
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.code !== "Digit0" || !previousId) return;
      e.preventDefault();
      pick(previousId);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // pick ändert sich bei jedem Rendern; relevant sind Auswahl und Liste
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcuts, characters, fixedOrder, selected?.id, previousId]);

  const mod = isMac ? "⌥" : "Alt+";
  const ctrl = isMac ? "⌘" : "Strg+";

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

  const groups = (() => {
    // Bei vielen Charakteren stehen die zuletzt benutzten als eigene Gruppe ganz oben
    const top = characters.length > 4 ? byRecent(characters.filter((c) => recent.includes(c.id))).slice(0, 3) : [];
    const rest = characters.filter((c) => !top.some((t) => t.id === c.id));
    return [
      { key: "recent", title: "Zuletzt benutzt", items: top },
      { key: "characters", title: "Charaktere", items: byRecent(rest.filter((c) => !c.is_npc)) },
      { key: "npcs", title: "NPCs", items: byRecent(rest.filter((c) => c.is_npc)) },
    ].filter((g) => g.items.length > 0);
  })();

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
        <div className="menu-pop absolute left-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
          <ul role="listbox" aria-label={label} className="max-h-64 overflow-y-auto p-1.5">
            {groups.map((g, index) => (
              <li key={g.key} role="presentation">
                {groups.length > 1 && <p className={`px-2.5 pb-1 text-xs text-muted ${index > 0 ? "pt-2" : "pt-0.5"}`}>{g.title}</p>}
                <ul role="group" aria-label={g.title}>
                  {g.items.map((c) => (
                    <li key={c.id} role="option" aria-selected={c.id === selected.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          pick(c.id);
                          setOpen(false);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-fg transition hover:bg-surface-2 active:bg-surface-3"
                      >
                        <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={28} />
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        {shortcuts && c.id === previousId && (
                          <kbd className="hidden shrink-0 rounded border border-line px-1 font-sans text-[10px] text-muted [@media(hover:hover)]:block">
                            {mod}0
                          </kbd>
                        )}
                        {c.id === selected.id && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {shortcuts && (
            <div className="hidden items-center gap-2 border-t border-line px-3 py-2 text-xs text-muted [@media(hover:hover)]:flex">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQuickOpen(true);
                }}
                className="flex items-center gap-1.5 transition hover:text-fg"
              >
                <Search className="h-3.5 w-3.5" strokeWidth={2} />
                Suchen
                <kbd className="rounded border border-line px-1 font-sans">{ctrl}K</kbd>
              </button>
            </div>
          )}
        </div>
      )}
      {quickOpen && (
        <QuickSwitch
          label={label}
          characters={byRecent(fixedOrder)}
          selectedId={selected.id}
          onPick={(id) => {
            pick(id);
            setQuickOpen(false);
          }}
          onClose={() => setQuickOpen(false)}
        />
      )}
    </div>
  );
}

// Schnellsuche: Namen tippen, mit ↑/↓ wählen, Enter übernimmt. Die zuletzt Benutzten stehen oben.
function QuickSwitch({
  label,
  characters,
  selectedId,
  onPick,
  onClose,
}: {
  label: string;
  characters: Character[];
  selectedId: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const results = filterByName(characters, query);
  const current = Math.min(index, Math.max(0, results.length - 1));

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={label} onClick={onClose} className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[15dvh]">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((current + 1) % Math.max(1, results.length));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((current - 1 + results.length) % Math.max(1, results.length));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (results[current]) onPick(results[current].id);
              }
            }}
            placeholder="Charakter suchen"
            aria-label="Charakter suchen"
            className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none sm:text-sm"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-3 text-sm text-muted">Nichts gefunden.</li>}
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseMove={() => setIndex(i)}
                onClick={() => onPick(c.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-fg transition ${i === current ? "bg-surface-2" : ""}`}
              >
                <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={28} />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                {c.id === selectedId && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
