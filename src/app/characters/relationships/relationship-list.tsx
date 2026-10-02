"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteRelationship, updateRelationship } from "../actions";
import { FAMILY_ROLES, REL_CATEGORIES, categoryInfo } from "@/lib/relationships";
import type { Character, CharacterRelationship, RelationshipCategory } from "@/lib/types";

const field = "rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent";

export function EditForm({ rel, onDone }: { rel: CharacterRelationship; onDone: () => void }) {
  const [category, setCategory] = useState<RelationshipCategory>(rel.category);
  const [color, setColor] = useState(rel.color);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const err = await updateRelationship(rel.id, null, data);
      if (err) setError(err);
      else onDone();
    });
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2 border-t border-line pt-3">
      <p className="w-full text-xs text-muted">
        Die Beziehung entwickelt sich weiter? Die Änderung wird mit Datum im Verlauf festgehalten.
      </p>
      <select
        name="category"
        value={category}
        onChange={(e) => {
          setCategory(e.target.value as RelationshipCategory);
          setColor(categoryInfo(e.target.value).color);
        }}
        className={field}
      >
        {REL_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      {category === "familie" && (
        <select name="family_role" defaultValue={rel.family_role ?? "verwandt"} className={field}>
          {FAMILY_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      )}
      <input name="type" required defaultValue={rel.type} placeholder="Bezeichnung" className={`w-36 ${field}`} />
      <input
        type="color"
        name="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded-md border border-line bg-surface p-1"
      />
      <input name="label" defaultValue={rel.label ?? ""} placeholder="Notiz zur Beziehung" className={`w-44 ${field}`} />
      <input name="note" placeholder="Was ist passiert? (für den Verlauf)" className={`w-56 ${field}`} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong disabled:opacity-50"
      >
        {pending ? "Speichere..." : "Speichern"}
      </button>
      <button type="button" onClick={onDone} className="text-xs text-muted hover:text-fg">
        Abbrechen
      </button>
      {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}

export function RelationshipList({
  relationships,
  characters,
  currentUserId,
  isWorldOwner,
}: {
  relationships: CharacterRelationship[];
  characters: Character[];
  currentUserId: string;
  isWorldOwner: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const charactersById = new Map(characters.map((c) => [c.id, c]));
  const canDelete = (rel: CharacterRelationship) => rel.created_by === currentUserId || isWorldOwner;
  const canEdit = (rel: CharacterRelationship) =>
    canDelete(rel) ||
    [rel.character_a_id, rel.character_b_id].some((id) => charactersById.get(id)?.owner_id === currentUserId);

  async function handleDelete(id: string) {
    if (!confirm("Diese Beziehung wirklich löschen?")) return;
    const error = await deleteRelationship(id);
    if (error) alert(error);
  }

  if (relationships.length === 0) {
    return <p className="text-sm text-muted">Keine Beziehungen in dieser Ansicht.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {relationships.map((rel) => {
        const a = charactersById.get(rel.character_a_id);
        const b = charactersById.get(rel.character_b_id);
        return (
          <div key={rel.id} className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-fg-soft">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: rel.color }} />
                <span>
                  <span className="font-medium text-fg">{a?.name ?? "?"}</span> · {rel.type} ·{" "}
                  <span className="font-medium text-fg">{b?.name ?? "?"}</span>
                  {rel.label && <span className="text-muted"> – {rel.label}</span>}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                {canEdit(rel) && (
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === rel.id ? null : rel.id)}
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
            {editingId === rel.id && <EditForm rel={rel} onDone={() => setEditingId(null)} />}
          </div>
        );
      })}
    </div>
  );
}
