"use client";

import { useState } from "react";
import { AtSign } from "lucide-react";
import { EarlierEntries } from "./earlier-entries";

export type EntryListItem = {
  id: string;
  kind: string;
  authorId: string;
  mentionedIds: string[];
  node: React.ReactNode;
};
export type FilterCharacter = { id: string; name: string; own: boolean };

type Mode = "mentions" | "author" | "both";
const MODES: { id: Mode; label: string }[] = [
  { id: "mentions", label: "Erwähnt" },
  { id: "author", label: "Geschrieben von" },
  { id: "both", label: "Beides" },
];
const KEEP_VISIBLE = 5;

// Beiträge einer Szene: die letzten sind sichtbar, ältere lassen sich einklappen. Zusätzlich lässt sich nach einem
// Charakter filtern (@Erwähnungen und/oder Beiträge dieses Charakters), um beim Antworten schnell das Relevante zu sehen.
export function EntryList({ items, characters }: { items: EntryListItem[]; characters: FilterCharacter[] }) {
  const [filterId, setFilterId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("mentions");

  function matches(item: EntryListItem, id: string, m: Mode) {
    if (item.kind === "chapter") return false;
    const mentioned = item.mentionedIds.includes(id);
    const written = item.authorId === id && item.kind !== "narrator";
    return m === "mentions" ? mentioned : m === "author" ? written : mentioned || written;
  }

  const filter = filterId ? characters.find((c) => c.id === filterId) ?? null : null;
  const shown = filter ? items.filter((i) => matches(i, filter.id, mode)) : items;
  const showFilterBar = items.length >= 3 && characters.length > 0;

  const mark = (list: EntryListItem[], offset: number) =>
    list.map((item, i) =>
      offset + i === shown.length - 1 ? (
        <div key={item.id} id="letzter-beitrag" className="scroll-mt-20">
          {item.node}
        </div>
      ) : (
        <div key={item.id}>{item.node}</div>
      ),
    );

  const earlierCount = filter ? 0 : Math.max(0, shown.length - KEEP_VISIBLE);

  return (
    <>
      {showFilterBar && (
        <div className="mb-3 flex flex-col gap-2">
          <div
            className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Beiträge filtern"
          >
            <button
              type="button"
              onClick={() => setFilterId(null)}
              aria-pressed={!filter}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition active:scale-95 ${
                !filter ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
              }`}
            >
              Alle
            </button>
            {characters.map((c) => {
              const count = items.filter((i) => matches(i, c.id, mode)).length;
              const active = filterId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilterId(active ? null : c.id)}
                  aria-pressed={active}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition active:scale-95 ${
                    active ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
                  }`}
                >
                  <AtSign className="h-3 w-3" strokeWidth={2.5} />
                  {c.name.split(" ")[0]}
                  {c.own && !active && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label="dein Charakter" />}
                  <span className={active ? "opacity-80" : "text-muted"}>{count}</span>
                </button>
              );
            })}
          </div>
          {filter && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <div className="flex rounded-full border border-line bg-surface p-0.5" role="group" aria-label="Filterart">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    aria-pressed={mode === m.id}
                    className={`rounded-full px-2.5 py-1 transition ${
                      mode === m.id ? "bg-surface-3 font-medium text-fg" : "hover:text-fg"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <span>
                {shown.length} {shown.length === 1 ? "Beitrag" : "Beiträge"} für {filter.name.split(" ")[0]}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4">
        {filter && shown.length === 0 && (
          <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
            Keine Beiträge{" "}
            {mode === "mentions" ? "mit einer Erwähnung von" : mode === "author" ? "von" : "zu"} {filter.name.split(" ")[0]}.
          </p>
        )}
        {earlierCount >= 2 ? (
          <>
            <EarlierEntries count={earlierCount}>
              {shown.slice(0, earlierCount).map((i) => (
                <div key={i.id}>{i.node}</div>
              ))}
            </EarlierEntries>
            {mark(shown.slice(earlierCount), earlierCount)}
          </>
        ) : (
          mark(shown, 0)
        )}
      </div>
    </>
  );
}
