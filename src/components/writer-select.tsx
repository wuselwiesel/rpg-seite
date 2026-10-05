"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";

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
  // Alt+1 … Alt+9 wählen den n-ten Charakter, Alt+0 den zuletzt davor benutzten (Mac: ⌥)
  shortcuts?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = characters.find((c) => c.id === value) ?? characters[0];
  // Zuletzt benutzte Charaktere (zuerst der neueste), gemerkt im Browser und für alle Szenen gemeinsam
  const [recent, setRecent] = useState<string[]>([]);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Browser-Speicher ist erst nach dem Hydrieren lesbar
    setRecent(readRecent());
    setIsMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent));
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

  // Feste Reihenfolge für die Zifferntasten: Charaktere, dann NPCs, so wie sie angelegt wurden
  const fixedOrder = [...characters.filter((c) => !c.is_npc), ...characters.filter((c) => c.is_npc)];
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
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const m = /^Digit([0-9])$/.exec(e.code);
      if (!m) return;
      const n = Number(m[1]);
      const target = n === 0 ? previousId : fixedOrder[n - 1]?.id;
      if (!target) return;
      e.preventDefault();
      if (target !== selected?.id) pick(target);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // pick/fixedOrder ändern sich bei jedem Rendern; relevant sind Auswahl und Liste
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcuts, characters, selected?.id, previousId]);

  const hintFor = (id: string) => {
    const parts: string[] = [];
    const index = fixedOrder.findIndex((c) => c.id === id);
    if (index >= 0 && index < 9) parts.push(String(index + 1));
    if (id === previousId) parts.push("0");
    return parts;
  };
  const mod = isMac ? "⌥" : "Alt+";

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
          {(() => {
            // Bei vielen Charakteren stehen die zuletzt benutzten als eigene Gruppe ganz oben
            const top = characters.length > 4 ? byRecent(characters.filter((c) => recent.includes(c.id))).slice(0, 3) : [];
            const rest = characters.filter((c) => !top.some((t) => t.id === c.id));
            return [
              { key: "recent", title: "Zuletzt benutzt", items: top },
              { key: "characters", title: "Charaktere", items: byRecent(rest.filter((c) => !c.is_npc)) },
              { key: "npcs", title: "NPCs", items: byRecent(rest.filter((c) => c.is_npc)) },
            ];
          })()
            .filter((g) => g.items.length > 0)
            .map((g, index, groups) => (
              <li key={g.key} role="presentation">
                {groups.length > 1 && <p className={`px-2.5 pb-1 text-xs text-muted ${index > 0 ? "pt-2" : "pt-0.5"}`}>{g.title}</p>}
                <ul role="group" aria-label={g.title}>
                  {g.items.map((c) => (
                    <li key={c.id} role="option" aria-selected={c.id === selected.id}>
                      <button
                        type="button"
                        onClick={() => {
                          pick(c.id);
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-fg transition hover:bg-surface-2 active:bg-surface-3"
                      >
                        <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={28} />
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        {shortcuts && (
                          <span className="hidden shrink-0 gap-1 text-[10px] text-muted [@media(hover:hover)]:flex">
                            {hintFor(c.id).map((k) => (
                              <kbd key={k} className="rounded border border-line px-1 font-sans">
                                {mod}
                                {k}
                              </kbd>
                            ))}
                          </span>
                        )}
                        {c.id === selected.id && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
