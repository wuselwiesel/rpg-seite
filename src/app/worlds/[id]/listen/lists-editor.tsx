"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import type { ChoiceList } from "@/lib/choice-lists";
import { addChoiceOptions, createChoiceList, deleteChoiceList, deleteChoiceOption, updateChoiceList } from "./actions";

const input = "rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";

export function ListsEditor({ worldId, lists }: { worldId: string; lists: ChoiceList[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [newMode, setNewMode] = useState<"dropdown" | "text">("dropdown");

  function run(fn: () => Promise<string | null>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const err = await fn();
      if (err) return setError(err);
      after?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {lists.map((list) => (
        <ListCard key={list.id} first={list === lists[0]} list={list} worldId={worldId} disabled={pending} run={run} />
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createChoiceList(worldId, newLabel, newMode), () => setNewLabel(""));
        }}
        data-tour="listen-neu"
        className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-line p-4"
      >
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-muted">
          Neue Liste
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} maxLength={40} placeholder="z. B. Beruf" className={input} />
        </label>
        <select value={newMode} onChange={(e) => setNewMode(e.target.value as "dropdown" | "text")} aria-label="Art der Liste" className={input}>
          <option value="dropdown">Als Dropdown</option>
          <option value="text">Freies Textfeld</option>
        </select>
        <button type="submit" disabled={pending || !newLabel.trim()} className="flex items-center gap-1.5 rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          Anlegen
        </button>
      </form>

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function ListCard({ list, first, worldId, disabled, run }: { list: ChoiceList; first: boolean; worldId: string; disabled: boolean; run: (fn: () => Promise<string | null>, after?: () => void) => void }) {
  const [label, setLabel] = useState(list.label);
  const [adding, setAdding] = useState("");

  return (
    <section id={`liste-${list.id}`} data-tour={first ? "listen-erste" : undefined} aria-label={list.label} className="flex scroll-mt-20 flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        {list.isSpecies ? (
          <h2 className="mr-auto font-serif text-xl text-fg">{list.label}</h2>
        ) : (
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => label.trim() && label.trim() !== list.label && run(() => updateChoiceList(worldId, list.id, { label }))}
            maxLength={40}
            aria-label="Name der Liste"
            className={`${input} mr-auto min-w-0 flex-1 font-serif text-lg`}
          />
        )}
        <select
          value={list.mode}
          disabled={disabled}
          onChange={(e) => run(() => updateChoiceList(worldId, list.id, { mode: e.target.value as "dropdown" | "text" }))}
          aria-label="Art der Liste"
          className={input}
        >
          <option value="dropdown">Als Dropdown</option>
          <option value="text">Freies Textfeld</option>
        </select>
        {!list.isSpecies && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => window.confirm(`Liste „${list.label}“ löschen? Bereits gewählte Werte bleiben in den Profilen erhalten, werden aber nicht mehr angezeigt.`) && run(() => deleteChoiceList(worldId, list.id))}
            title="Liste löschen"
            aria-label="Liste löschen"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {list.mode === "dropdown" && (
        <>
          {list.options.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {list.options.map((o) => (
                <li key={o.id} className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-3 pr-1.5 text-sm text-fg">
                  {o.label}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => run(() => deleteChoiceOption(worldId, o.id))}
                    aria-label={`${o.label} entfernen`}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition hover:bg-surface-3 hover:text-fg"
                  >
                    <X className="h-3 w-3" strokeWidth={2.25} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addChoiceOptions(worldId, list.id, adding), () => setAdding(""));
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              placeholder="Einträge, mit Komma getrennt"
              aria-label={`Einträge zu ${list.label} hinzufügen`}
              className={`${input} min-w-[14rem] flex-1`}
            />
            <button type="submit" disabled={disabled || !adding.trim()} className="rounded-md bg-surface-2 px-4 py-2 text-sm font-medium text-fg-soft transition hover:text-fg disabled:opacity-50">
              Hinzufügen
            </button>
          </form>
        </>
      )}
    </section>
  );
}
