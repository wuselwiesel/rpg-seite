"use client";

import { useEffect, useRef, useState } from "react";
import { AtSign, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseMentionedCharacterIdsFromHtml } from "@/lib/mentions";
import type { Character, StoryEntry } from "@/lib/types";
import { EarlierEntries } from "./earlier-entries";
import { StoryEntryItem } from "./story-entry-item";

export type EntryListItem = {
  id: string;
  kind: string;
  authorId: string;
  mentionedIds: string[];
  node: React.ReactNode;
};
export type FilterCharacter = { id: string; name: string; own: boolean; wrote: boolean };

type Mode = "mentions" | "author" | "both";
const MODES: { id: Mode; label: string }[] = [
  { id: "mentions", label: "Erwähnt" },
  { id: "author", label: "Geschrieben von" },
  { id: "both", label: "Beides" },
];
const KEEP_VISIBLE = 5;

// Beiträge einer Szene: die letzten sind sichtbar, ältere lassen sich einklappen. Zusätzlich lässt sich nach einem
// Charakter filtern (@Erwähnungen und/oder Beiträge dieses Charakters), um beim Antworten schnell das Relevante zu sehen.
export function EntryList({
  items,
  characters,
  storyPostId,
  myCharacterIds,
  mentionCharacters,
}: {
  items: EntryListItem[];
  characters: FilterCharacter[];
  storyPostId: string;
  // Für neu eintreffende Beiträge (Realtime): wer darf sie bearbeiten/löschen, und wer sind
  // die Charaktere für Avatar/Name und @-Erwähnungen im Bearbeiten-Formular.
  myCharacterIds: string[];
  mentionCharacters: Character[];
}) {
  const [filterId, setFilterId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("mentions");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  // Neue Beiträge anderer, die diese Szene offen haben, kommen per Realtime dazu – kein Neuladen nötig.
  const [live, setLive] = useState<StoryEntry[]>([]);
  const seenIds = useRef<Set<string>>(new Set(items.map((i) => i.id)));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`story-entries-${storyPostId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "story_entries", filter: `story_post_id=eq.${storyPostId}` },
        (payload) => {
          const row = payload.new as StoryEntry;
          if (seenIds.current.has(row.id)) return;
          seenIds.current.add(row.id);
          const author = mentionCharacters.find((c) => c.id === row.character_id) ?? null;
          const rollTarget = row.roll_target_character_id
            ? (mentionCharacters.find((c) => c.id === row.roll_target_character_id) ?? null)
            : null;
          setLive((prev) => [
            ...prev,
            { ...row, characters: author, roll_target_character: rollTarget ? { name: rollTarget.name } : null },
          ]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyPostId]);

  useEffect(() => {
    if (!moreOpen) return;
    function onDown(e: PointerEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  function matches(item: EntryListItem, id: string, m: Mode) {
    if (item.kind === "chapter") return false;
    const mentioned = item.mentionedIds.includes(id);
    const written = item.authorId === id && item.kind !== "narrator";
    return m === "mentions" ? mentioned : m === "author" ? written : mentioned || written;
  }

  const liveListItems: EntryListItem[] = live.map((entry) => ({
    id: entry.id,
    kind: entry.kind ?? "entry",
    authorId: entry.character_id,
    mentionedIds: entry.kind === "chapter" ? [] : parseMentionedCharacterIdsFromHtml(entry.content),
    node: (
      <StoryEntryItem
        entry={entry}
        storyPostId={storyPostId}
        canManage={myCharacterIds.includes(entry.character_id)}
        mentionCharacters={mentionCharacters}
      />
    ),
  }));
  const allItems = live.length > 0 ? [...items, ...liveListItems] : items;

  const filter = filterId ? characters.find((c) => c.id === filterId) ?? null : null;
  const shown = filter ? allItems.filter((i) => matches(i, filter.id, mode)) : allItems;
  const showFilterBar = allItems.length >= 3 && characters.length > 0;
  // Direkt sichtbar: wer in der Szene selbst geschrieben hat. Alle anderen (eigene Charaktere,
  // die hier noch nicht dran waren, oder nur Erwähnte) landen im "weitere"-Button, damit die
  // Leiste nicht überläuft und man am Desktop nicht scrollen muss, um sie zu sehen.
  const primary = characters.filter((c) => c.wrote);
  const secondary = characters.filter((c) => !c.wrote);
  const filterInSecondary = !!filter && !filter.wrote;

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
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Beiträge filtern">
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
            {primary.map((c) => {
              const count = allItems.filter((i) => matches(i, c.id, mode)).length;
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
            {secondary.length > 0 && (
              <div ref={moreRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={moreOpen}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition active:scale-95 ${
                    filterInSecondary ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
                  }`}
                >
                  {filterInSecondary ? (
                    <>
                      <AtSign className="h-3 w-3" strokeWidth={2.5} />
                      {filter!.name.split(" ")[0]}
                    </>
                  ) : (
                    `+${secondary.length} weitere`
                  )}
                  <ChevronDown className={`h-3 w-3 transition-transform ${moreOpen ? "rotate-180" : ""}`} strokeWidth={2.5} />
                </button>
                {moreOpen && (
                  <div
                    role="listbox"
                    aria-label="Weitere Charaktere"
                    className="menu-pop absolute left-0 top-full z-30 mt-1 max-h-64 w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lg"
                  >
                    {secondary.map((c) => {
                      const count = allItems.filter((i) => matches(i, c.id, mode)).length;
                      const active = filterId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setFilterId(active ? null : c.id);
                            setMoreOpen(false);
                          }}
                          aria-pressed={active}
                          className={`flex w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium transition ${
                            active ? "bg-accent-strong/15 text-accent" : "text-fg-soft hover:bg-surface-2"
                          }`}
                        >
                          <AtSign className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                          <span className="min-w-0 flex-1 truncate">{c.name}</span>
                          {c.own && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="dein Charakter" />}
                          <span className="shrink-0 text-muted">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
