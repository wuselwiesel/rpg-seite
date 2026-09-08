"use client";

import { Trash2 } from "lucide-react";
import { deleteRelationship } from "../actions";
import type { Character, CharacterRelationship } from "@/lib/types";

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
  const charactersById = new Map(characters.map((c) => [c.id, c]));
  const canManage = (rel: CharacterRelationship) => rel.created_by === currentUserId || isWorldOwner;

  async function handleDelete(id: string) {
    if (!confirm("Diese Beziehung wirklich löschen?")) return;
    const error = await deleteRelationship(id);
    if (error) alert(error);
  }

  if (relationships.length === 0) {
    return <p className="text-sm text-muted">Noch keine Beziehungen eingetragen.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {relationships.map((rel) => {
        const a = charactersById.get(rel.character_a_id);
        const b = charactersById.get(rel.character_b_id);
        return (
          <div
            key={rel.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2 text-fg-soft">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: rel.color }} />
              <span>
                <span className="font-medium text-fg">{a?.name ?? "?"}</span> · {rel.type} ·{" "}
                <span className="font-medium text-fg">{b?.name ?? "?"}</span>
                {rel.label && <span className="text-muted"> – {rel.label}</span>}
              </span>
            </span>
            {canManage(rel) && (
              <button
                type="button"
                onClick={() => handleDelete(rel.id)}
                title="Löschen"
                className="shrink-0 rounded p-1 text-muted transition hover:bg-surface-3 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
