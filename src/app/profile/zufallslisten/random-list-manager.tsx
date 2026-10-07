"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { POOL_KINDS, POOL_LABELS, type PoolKind } from "@/lib/random-pools";
import { parseEntries } from "@/lib/random-lists";
import { addRandomEntries, deleteRandomEntry, updateRandomEntry } from "./actions";

export type EntryRow = { id: string; kind: PoolKind; text: string; created_by: string };

const field = "rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent";

export function RandomListManager({
  worldName,
  entries,
  currentUserId,
  isWorldOwner,
}: {
  worldName: string;
  entries: EntryRow[];
  currentUserId: string;
  isWorldOwner: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<PoolKind>("vorname");
  const [text, setText] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  const mine = entries.filter((e) => e.kind === kind);
  const count = (k: PoolKind) => entries.filter((e) => e.kind === k).length;
  const lines = parseEntries(text).length;

  function add() {
    setMessage(null);
    startTransition(async () => {
      const result = await addRandomEntries(kind, text);
      if ("error" in result) return setMessage({ ok: false, text: result.error });
      setText("");
      setMessage({ ok: true, text: result.skipped ? `${result.added} neu, ${result.skipped} schon vorhanden.` : `${result.added} hinzugefügt.` });
      router.refresh();
    });
  }

  function saveEdit() {
    if (!editing) return;
    setMessage(null);
    startTransition(async () => {
      const error = await updateRandomEntry(editing.id, editing.text);
      if (error) return setMessage({ ok: false, text: error });
      setEditing(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const error = await deleteRandomEntry(id);
      if (error) setMessage({ ok: false, text: error });
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">{worldName}</p>

      <div role="tablist" aria-label="Liste" className="flex flex-wrap gap-1.5">
        {POOL_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => {
              setKind(k);
              setMessage(null);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${kind === k ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`}
          >
            {POOL_LABELS[k]} <span className="text-xs opacity-70">{count(k)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Neue Einträge
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Eine Zeile pro Eintrag"
            aria-label={`Neue Einträge: ${POOL_LABELS[kind]}`}
            className={`${field} resize-y`}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={add}
            disabled={pending || lines === 0}
            className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:bg-surface-2 disabled:text-muted disabled:opacity-100"
          >
            {lines > 1 ? `${lines} Einträge hinzufügen` : "Hinzufügen"}
          </button>
          {message && (
            <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-fg">
          {POOL_LABELS[kind]} ({mine.length})
        </p>
        {mine.length === 0 ? (
          <p className="text-sm text-muted">Noch keine eigenen Einträge.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {mine.map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                {editing?.id === e.id ? (
                  <>
                    <input
                      autoFocus
                      value={editing.text}
                      maxLength={200}
                      aria-label="Eintrag bearbeiten"
                      onChange={(ev) => setEditing({ id: e.id, text: ev.target.value })}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") {
                          ev.preventDefault();
                          saveEdit();
                        } else if (ev.key === "Escape") setEditing(null);
                      }}
                      className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-base text-fg outline-none focus:border-accent sm:text-sm"
                    />
                    <button type="button" onClick={saveEdit} disabled={pending || !editing.text.trim()} aria-label="Speichern" className="shrink-0 rounded-full p-1 text-muted transition hover:text-accent disabled:opacity-50">
                      <Check className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button type="button" onClick={() => setEditing(null)} aria-label="Abbrechen" className="shrink-0 rounded-full p-1 text-muted transition hover:text-fg">
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 break-words text-sm text-fg">{e.text}</span>
                    {(e.created_by === currentUserId || isWorldOwner) && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setMessage(null);
                            setEditing({ id: e.id, text: e.text });
                          }}
                          aria-label={`„${e.text}“ bearbeiten`}
                          className="shrink-0 rounded-full p-1 text-muted transition hover:text-fg"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(e.id)}
                          aria-label={`„${e.text}“ löschen`}
                          className="shrink-0 rounded-full p-1 text-muted transition hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
