"use client";

import { confirmDialog, alertDialog } from "@/components/confirm-dialog";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, Pencil, Trash2, Users } from "lucide-react";
import { deleteRelationship, getSharedScenes, resolveRelationshipConflict, updateRelationship, type SharedScene } from "../actions";
import { RelationshipFields } from "./relationship-fields";
import type { Character, CharacterRelationship } from "@/lib/types";

export type RelationshipConflict = { characterId: string; characterName: string; label: string; expected: string };

// Aktions-Symbole: mit Maus erst beim Darüberfahren, am Handy nach Antippen der Zeile
const REVEAL =
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/rel:opacity-100 [@media(hover:hover)]:focus-within:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0 [@media(hover:none)]:group-data-[tapped]/rel:pointer-events-auto [@media(hover:none)]:group-data-[tapped]/rel:opacity-100";

export function EditForm({ rel, characters, onDone }: { rel: CharacterRelationship; characters: Character[]; onDone: () => void }) {
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
    <form onSubmit={submit} className="mt-2 flex flex-col gap-3 border-t border-line pt-3">
      <RelationshipFields
        characters={characters}
        lockPair
        editing
        initial={{
          character_a_id: rel.character_a_id,
          character_b_id: rel.character_b_id,
          type: rel.type,
          type_b: rel.type_b,
          label: rel.label,
          category: rel.category,
          family_role: rel.family_role,
          color: rel.color,
          is_secret: rel.is_secret,
          ended_on: rel.ended_on,
          ended_label: rel.ended_label,
        }}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
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
      </div>
    </form>
  );
}

export function SharedScenes({ rel }: { rel: CharacterRelationship }) {
  const [scenes, setScenes] = useState<SharedScene[] | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && scenes === null) {
      startTransition(async () => setScenes(await getSharedScenes(rel.character_a_id, rel.character_b_id)));
    }
  }

  return (
    <div className="mt-1.5">
      <button type="button" onClick={toggle} className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
        <Users className="h-3.5 w-3.5" strokeWidth={2} />
        Gemeinsame Szenen
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col gap-1 text-xs">
          {pending && scenes === null && <span className="text-muted">Suche …</span>}
          {scenes?.length === 0 && <span className="text-muted">Noch keine gemeinsamen Szenen.</span>}
          {scenes?.map((s) => (
            <Link key={s.id} href={`/story/${s.id}`} className="w-fit text-fg-soft transition hover:text-accent">
              {s.title}
              <span className="ml-2 text-muted">{new Date(s.created_at).toLocaleDateString("de-DE")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function RelationshipList({
  relationships,
  characters,
  currentUserId,
  isWorldOwner,
  conflicts = {},
  highlightId = null,
}: {
  relationships: CharacterRelationship[];
  characters: Character[];
  currentUserId: string;
  isWorldOwner: boolean;
  conflicts?: Record<string, RelationshipConflict[]>;
  highlightId?: string | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tappedId, setTappedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const charactersById = new Map(characters.map((c) => [c.id, c]));
  const canEdit = (rel: CharacterRelationship) =>
    rel.created_by === currentUserId ||
    isWorldOwner ||
    [rel.character_a_id, rel.character_b_id].some((id) => charactersById.get(id)?.owner_id === currentUserId);

  async function handleDelete(id: string) {
    if (!(await confirmDialog({ message: "Diese Beziehung wirklich löschen? Sie verschwindet auch aus den ChaBos.", confirmLabel: "Löschen", danger: true }))) return;
    const error = await deleteRelationship(id);
    if (error) void alertDialog(error);
  }

  function resolve(relId: string, characterId: string, use: "netz" | "chabo") {
    startTransition(async () => {
      const error = await resolveRelationshipConflict(relId, characterId, use);
      if (error) void alertDialog(error);
    });
  }

  if (relationships.length === 0) {
    return <p className="text-sm text-muted">Keine Beziehungen in dieser Ansicht.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {relationships.map((rel) => {
        const a = charactersById.get(rel.character_a_id);
        const b = charactersById.get(rel.character_b_id);
        const ended = !!rel.ended_on || !!rel.ended_label;
        const rowConflicts = conflicts[rel.id] ?? [];
        return (
          <div
            key={rel.id}
            id={`beziehung-${rel.id}`}
            data-tapped={tappedId === rel.id ? "" : undefined}
            onClick={(e) => {
              if (!window.matchMedia("(hover: none)").matches) return;
              if ((e.target as HTMLElement).closest("a, button, input, select, textarea, form")) return;
              setTappedId((v) => (v === rel.id ? null : rel.id));
            }}
            className={`group/rel rounded-lg bg-surface-2 px-3 py-2 text-sm ${highlightId === rel.id ? "ring-2 ring-accent" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 items-start gap-2 text-fg-soft">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: rel.color }} />
                <span className={`min-w-0 ${ended ? "opacity-75" : ""}`}>
                  <span className="font-medium text-fg">{a?.name ?? "?"}</span>
                  {rel.type_b ? (
                    <>
                      {" "}sieht <span className="font-medium text-fg">{b?.name ?? "?"}</span> als {rel.type} ·{" "}
                      <span className="font-medium text-fg">{b?.name ?? "?"}</span> sieht{" "}
                      <span className="font-medium text-fg">{a?.name ?? "?"}</span> als {rel.type_b}
                    </>
                  ) : (
                    <>
                      {" "}· {rel.type} · <span className="font-medium text-fg">{b?.name ?? "?"}</span>
                    </>
                  )}
                  {ended && (
                    <span className="ml-2 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] text-muted">
                      {rel.ended_label || "beendet"}
                      {rel.ended_on ? ` · ${new Date(rel.ended_on).toLocaleDateString("de-DE")}` : ""}
                    </span>
                  )}
                  {rel.is_secret && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-accent">
                      <EyeOff className="h-3 w-3" strokeWidth={2} aria-label="Geheim" />
                    </span>
                  )}
                  {rel.label && <span className="text-muted"> – {rel.label}</span>}
                </span>
              </span>
              <span className={`flex shrink-0 items-center gap-0.5 ${REVEAL}`}>
                {canEdit(rel) && (
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === rel.id ? null : rel.id)}
                    title="Bearbeiten oder beenden"
                    aria-label="Beziehung bearbeiten"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-fg"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                )}
                {canEdit(rel) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(rel.id)}
                    title="Löschen"
                    aria-label="Beziehung löschen"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                )}
              </span>
            </div>

            {rowConflicts.map((c) => (
              <div key={c.characterId} className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-surface px-2 py-1 text-xs text-fg-soft">
                <Eye className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
                <span>
                  Im ChaBo von {c.characterName} steht „{c.label}“, hier „{c.expected}“.
                </span>
                <button type="button" onClick={() => resolve(rel.id, c.characterId, "netz")} className="text-accent hover:underline">
                  Netz übernehmen
                </button>
                <button type="button" onClick={() => resolve(rel.id, c.characterId, "chabo")} className="text-accent hover:underline">
                  ChaBo übernehmen
                </button>
              </div>
            ))}

            <SharedScenes rel={rel} />
            {editingId === rel.id && <EditForm rel={rel} characters={characters} onDone={() => setEditingId(null)} />}
          </div>
        );
      })}
    </div>
  );
}
