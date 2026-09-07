"use client";

import { useActionState } from "react";
import { createRelationship } from "../actions";
import type { Character, RelationshipType } from "@/lib/types";
import { TYPE_LABELS } from "./relationship-graph";

export function RelationshipForm({ characters }: { characters: Character[] }) {
  const [error, formAction, pending] = useActionState(createRelationship, null);

  if (characters.length < 2) {
    return <p className="text-sm text-muted">Du brauchst mindestens zwei Charaktere in der Welt.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Charakter A
        <select
          name="character_a_id"
          required
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        >
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Beziehung
        <select
          name="type"
          defaultValue="verbuendet"
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        >
          {(Object.keys(TYPE_LABELS) as RelationshipType[]).map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Charakter B
        <select
          name="character_b_id"
          required
          defaultValue={characters[1]?.id}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        >
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Notiz (optional)
        <input
          type="text"
          name="label"
          placeholder="z. B. Kindheitsfreunde"
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichere..." : "Hinzufügen"}
      </button>

      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
