"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteRelationship, updateRelationshipStep } from "../actions";
import { RelationshipForm } from "./relationship-form";
import { EditForm } from "./relationship-list";
import { formatDate } from "@/lib/format";
import { compareSteps, stepDate } from "@/lib/relationship-graph";
import { categoryInfo } from "@/lib/relationships";
import type {
  Character,
  CharacterRelationship,
  RelationshipHistoryEntry,
} from "@/lib/types";

// Verlauf: pro Beziehung die Entwicklung als Kette ("Rivalen -> Verbündet") mit Datum und Notiz.
export function RelationshipTimeline({
  relationships,
  history,
  characters,
  currentUserId,
  isWorldOwner,
}: {
  relationships: CharacterRelationship[];
  history: RelationshipHistoryEntry[];
  characters: Character[];
  currentUserId: string;
  isWorldOwner: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const canDelete = (rel: CharacterRelationship) =>
    rel.created_by === currentUserId || isWorldOwner;
  const canEdit = (rel: CharacterRelationship) =>
    canDelete(rel) ||
    characters.some(
      (c) =>
        c.owner_id === currentUserId &&
        (c.id === rel.character_a_id || c.id === rel.character_b_id),
    );

  async function handleDelete(id: string) {
    if (!confirm("Diese Beziehung samt Verlauf wirklich löschen?")) return;
    const error = await deleteRelationship(id);
    if (error) alert(error);
  }

  const names = new Map(characters.map((c) => [c.id, c.name]));
  const byRelationship = new Map<string, RelationshipHistoryEntry[]>();
  for (const h of history)
    byRelationship.set(h.relationship_id, [
      ...(byRelationship.get(h.relationship_id) ?? []),
      h,
    ]);

  const rows = relationships
    .map((rel) => ({
      rel,
      steps: (byRelationship.get(rel.id) ?? []).sort(compareSteps),
    }))
    .sort(
      (a, b) =>
        b.steps.length - a.steps.length ||
        a.rel.created_at.localeCompare(b.rel.created_at),
    );

  const addSection = (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setAdding((v) => !v)}
        className="flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:text-fg"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        {adding ? "Schließen" : "Beziehung hinzufügen"}
      </button>
      {adding && (
        <div className="mt-3 rounded-xl bg-surface-2 p-4">
          <RelationshipForm characters={characters} />
        </div>
      )}
    </div>
  );

  if (rows.length === 0) {
    return (
      <>
        {addSection}
        <p className="text-sm text-muted">
          Keine Beziehungen in dieser Ansicht.
        </p>
      </>
    );
  }

  return (
    <>
      {addSection}
      <ol className="flex flex-col gap-4">
        {rows.map(({ rel, steps }) => (
          <li key={rel.id} className="rounded-xl bg-surface-2 p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-fg">
                {names.get(rel.character_a_id) ?? "?"} &{" "}
                {names.get(rel.character_b_id) ?? "?"}
                <span className="ml-2 text-xs font-normal text-muted">
                  {categoryInfo(rel.category).label}
                </span>
              </p>
              <span className="flex shrink-0 items-center gap-0.5">
                {canEdit(rel) && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditingId(editingId === rel.id ? null : rel.id)
                    }
                    title="Beziehung weiterentwickeln"
                    className="rounded p-1 text-muted transition hover:bg-surface-3 hover:text-fg"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                )}
                {canDelete(rel) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(rel.id)}
                    title="Löschen"
                    className="rounded p-1 text-muted transition hover:bg-surface-3 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                )}
              </span>
            </div>
            <div className="relative flex flex-col gap-3 border-l-2 border-line pl-4">
              {steps.map((step, i) => (
                <div key={step.id} className="relative">
                  <span
                    className="absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full border-2 border-surface-2"
                    style={{ backgroundColor: step.color }}
                  />
                  <p className="text-sm text-fg">
                    {i > 0 && (
                      <span className="text-muted">{steps[i - 1].type} → </span>
                    )}
                    <span className="font-medium" style={{ color: step.color }}>
                      {step.type}
                    </span>
                    {step.label && (
                      <span className="text-fg-soft"> – {step.label}</span>
                    )}
                  </p>
                  {editingStep === step.id ? (
                    <StepEditForm step={step} onDone={() => setEditingStep(null)} />
                  ) : (
                    <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted">
                      <span>Seit {formatDate(stepDate(step))}</span>
                      {step.note && <span className="text-fg-soft">· {step.note}</span>}
                      {canEdit(rel) && (
                        <button
                          type="button"
                          onClick={() => setEditingStep(step.id)}
                          title="Datum und Notiz ändern"
                          aria-label="Datum und Notiz dieses Schritts ändern"
                          className="rounded p-0.5 text-muted transition hover:bg-surface-3 hover:text-fg"
                        >
                          <Pencil className="h-3 w-3" strokeWidth={2} />
                        </button>
                      )}
                    </p>
                  )}
                </div>
              ))}
              {steps.length <= 1 && editingId !== rel.id && (
                <p className="text-xs text-muted">
                  Noch keine Entwicklung. Mit dem Stift-Symbol kannst du sie
                  weiterentwickeln.
                </p>
              )}
            </div>
            {editingId === rel.id && (
              <EditForm rel={rel} onDone={() => setEditingId(null)} />
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

// Datum ("gilt seit") und Notiz eines vorhandenen Verlaufsschritts ändern.
function StepEditForm({ step, onDone }: { step: RelationshipHistoryEntry; onDone: () => void }) {
  const [since, setSince] = useState(stepDate(step));
  const [note, setNote] = useState(step.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const field =
    "rounded-md border border-line bg-surface px-2 py-1 text-xs text-fg outline-none focus:border-accent";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const err = await updateRelationshipStep(step.id, since, note);
      if (err) setError(err);
      else onDone();
    });
  }

  return (
    <form onSubmit={submit} className="mt-1 flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1 text-xs text-muted">
        Seit
        <input type="date" value={since} onChange={(e) => setSince(e.target.value)} required className={field} />
      </label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="Notiz (optional)"
        className={`min-w-0 flex-1 ${field}`}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent-strong px-2.5 py-1 text-xs font-medium text-on-accent-strong disabled:opacity-50"
      >
        {pending ? "…" : "Speichern"}
      </button>
      <button type="button" onClick={onDone} className="text-xs text-muted hover:text-fg">
        Abbrechen
      </button>
      {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
