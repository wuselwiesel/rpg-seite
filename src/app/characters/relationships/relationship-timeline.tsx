"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteRelationship } from "../actions";
import { RelationshipForm } from "./relationship-form";
import { EditForm } from "./relationship-list";
import { formatDate } from "@/lib/format";
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
      steps: (byRelationship.get(rel.id) ?? []).sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      ),
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
                  <p className="text-xs text-muted">
                    {i === 0 ? "Angelegt" : "Geändert"} am{" "}
                    {formatDate(step.created_at.slice(0, 10))}
                    {step.note && (
                      <span className="text-fg-soft"> · {step.note}</span>
                    )}
                  </p>
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
