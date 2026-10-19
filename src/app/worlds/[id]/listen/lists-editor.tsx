"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import type { ChoiceList } from "@/lib/choice-lists";
import { useConfirm, type ConfirmOptions } from "@/components/confirm-dialog";
import { addChoiceOptions, createChoiceList, deleteChoiceList, deleteChoiceOption, setChoiceOptionLimit, updateChoiceList } from "./actions";

// Vorschläge: Einträge für die leere Liste „Wesen“ (die Namen Vampir und Werwolf schalten deren Würfelregeln frei) und Namen für neue Listen
const SPECIES_SUGGESTIONS = ["Mensch", "Vampir", "Werwolf"];
const LIST_TEMPLATES: { label: string; mode: "dropdown" | "text" }[] = [
  { label: "Haus", mode: "dropdown" },
  { label: "Fraktion", mode: "dropdown" },
  { label: "Herkunft", mode: "dropdown" },
  { label: "Beruf", mode: "text" },
];

const input = "rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";

export function ListsEditor({ worldId, lists }: { worldId: string; lists: ChoiceList[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [newMode, setNewMode] = useState<"dropdown" | "text">("dropdown");
  // Zuletzt entfernter Eintrag: kurz mit „Rückgängig“ anbieten
  const [undo, setUndo] = useState<{ listId: string; label: string } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(t);
  }, [undo]);
  const { confirm, dialog } = useConfirm();

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
        <ListCard key={list.id} first={list === lists[0]} list={list} worldId={worldId} disabled={pending} run={run} confirm={confirm} onRemoved={(label) => setUndo({ listId: list.id, label })} />
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
        {LIST_TEMPLATES.filter((t) => !lists.some((l) => l.label.toLowerCase() === t.label.toLowerCase())).length > 0 && (
          <div className="flex w-full flex-wrap gap-1.5">
            {LIST_TEMPLATES.filter((t) => !lists.some((l) => l.label.toLowerCase() === t.label.toLowerCase())).map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => {
                  setNewLabel(t.label);
                  setNewMode(t.mode);
                }}
                className="rounded-full border border-line px-3 py-1 text-sm text-fg-soft transition hover:border-accent hover:text-accent"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
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

      {undo && (
        <div role="status" className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-fg shadow-lg lg:bottom-4">
          <span className="min-w-0 truncate">„{undo.label}“ entfernt</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const { listId, label } = undo;
              setUndo(null);
              run(() => addChoiceOptions(worldId, listId, label));
            }}
            className="shrink-0 font-medium text-accent hover:underline"
          >
            Rückgängig
          </button>
        </div>
      )}
      {dialog}
    </div>
  );
}

// Höchstzahl eines Eintrags: leer = unbegrenzt
function LimitInput({ value, label, disabled, onCommit }: { value: number | null; label: string; disabled: boolean; onCommit: (limit: number | null) => void }) {
  const [text, setText] = useState(value == null ? "" : String(value));
  function commit() {
    const trimmed = text.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next === value) return;
    if (next !== null && (!Number.isInteger(next) || next < 1 || next > 999)) {
      setText(value == null ? "" : String(value));
      return;
    }
    onCommit(next);
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      disabled={disabled}
      maxLength={3}
      placeholder="max"
      aria-label={`Höchstzahl für ${label} (leer = unbegrenzt)`}
      onChange={(e) => setText(e.target.value.replace(/\D/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
      className="w-11 rounded-md border border-line bg-surface px-1.5 py-0.5 text-center text-xs text-fg outline-none focus:border-accent"
    />
  );
}

function ListCard({
  list,
  first,
  worldId,
  disabled,
  run,
  confirm,
  onRemoved,
}: {
  list: ChoiceList;
  first: boolean;
  worldId: string;
  disabled: boolean;
  run: (fn: () => Promise<string | null>, after?: () => void) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  onRemoved: (label: string) => void;
}) {
  const [label, setLabel] = useState(list.label);
  const [adding, setAdding] = useState("");

  // „Wesen“ abgeschaltet: Das Feld entfällt in der Welt ganz (Charaktere, Filter, Profile); wieder einschaltbar
  if (list.isSpecies && list.disabled) {
    return (
      <section id={`liste-${list.id}`} data-tour={first ? "listen-erste" : undefined} aria-label={list.label} className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-line bg-surface p-4">
        <h2 className="mr-auto font-serif text-xl text-muted">{list.label}</h2>
        <span className="text-sm text-muted">Entfernt</span>
        <button type="button" disabled={disabled} onClick={() => run(() => updateChoiceList(worldId, list.id, { disabled: false }))} className="rounded-full border border-line px-3 py-1 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50">
          Wieder einschalten
        </button>
      </section>
    );
  }

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
        {list.isSpecies && (
          <button
            type="button"
            disabled={disabled}
            onClick={async () => {
              const ok = await confirm({
                message: "Wesen aus dieser Welt entfernen? Das Feld entfällt beim Anlegen und Bearbeiten, im Profil und in den Filtern. Bereits gewählte Werte bleiben erhalten und kommen zurück, wenn du es wieder einschaltest.",
                confirmLabel: "Wesen entfernen",
                danger: true,
              });
              if (ok) run(() => updateChoiceList(worldId, list.id, { disabled: true }));
            }}
            title="Wesen entfernen"
            aria-label="Wesen entfernen"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
        {!list.isSpecies && (
          <button
            type="button"
            disabled={disabled}
            onClick={async () => {
              const ok = await confirm({
                message: `Liste „${list.label}“ löschen? Bereits gewählte Werte bleiben in den Profilen erhalten, werden aber nicht mehr angezeigt.`,
                confirmLabel: "Liste löschen",
                danger: true,
              });
              if (ok) run(() => deleteChoiceList(worldId, list.id));
            }}
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
          {list.isSpecies && list.options.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {SPECIES_SUGGESTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={() => run(() => addChoiceOptions(worldId, list.id, label))}
                  className="flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-sm text-fg-soft transition hover:border-accent hover:text-accent"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                  {label}
                </button>
              ))}
              <button
                type="button"
                disabled={disabled}
                onClick={() => run(() => addChoiceOptions(worldId, list.id, SPECIES_SUGGESTIONS.join(", ")))}
                className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium text-fg-soft transition hover:text-fg"
              >
                Alle übernehmen
              </button>
            </div>
          )}
          {list.options.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {list.options.map((o) => (
                <li key={o.id} className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-3 pr-1.5 text-sm text-fg">
                  {o.label}
                  <span className="text-xs tabular-nums text-muted" title="So viele Charaktere haben diesen Eintrag (Höchstzahl)">
                    {o.used ?? 0}
                    {o.maxCount != null ? `/${o.maxCount}` : ""}
                  </span>
                  <LimitInput
                    key={`${o.id}:${o.maxCount ?? ""}`}
                    value={o.maxCount ?? null}
                    label={o.label}
                    disabled={disabled}
                    onCommit={(limit) => run(() => setChoiceOptionLimit(worldId, o.id, limit))}
                  />
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => run(() => deleteChoiceOption(worldId, o.id), () => onRemoved(o.label))}
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
