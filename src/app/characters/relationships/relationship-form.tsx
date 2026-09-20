"use client";

import { useActionState, useState } from "react";
import { createRelationship } from "../actions";
import { FAMILY_ROLES, REL_CATEGORIES, categoryInfo } from "@/lib/relationships";
import type { Character, RelationshipCategory } from "@/lib/types";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent";

export function RelationshipForm({ characters }: { characters: Character[] }) {
  const [error, formAction, pending] = useActionState(createRelationship, null);
  const [category, setCategory] = useState<RelationshipCategory>("freundschaft");
  const [color, setColor] = useState(categoryInfo("freundschaft").color);
  const [role, setRole] = useState("eltern");

  if (characters.length < 2) {
    return <p className="text-sm text-muted">Du brauchst mindestens zwei Charaktere in der Welt.</p>;
  }

  const info = categoryInfo(category);
  const directional = category === "familie" && role === "eltern";

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Art
        <select
          name="category"
          value={category}
          onChange={(e) => {
            const next = e.target.value as RelationshipCategory;
            setCategory(next);
            setColor(categoryInfo(next).color);
          }}
          className={field}
        >
          {REL_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      {category === "familie" && (
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Verwandtschaft
          <select name="family_role" value={role} onChange={(e) => setRole(e.target.value)} className={field}>
            {FAMILY_ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        {directional ? "A (Elternteil)" : "Charakter A"}
        <select name="character_a_id" required className={field}>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        {directional ? "B (Kind)" : "Charakter B"}
        <select name="character_b_id" required defaultValue={characters[1]?.id} className={field}>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Bezeichnung
        <input
          type="text"
          name="type"
          list="relationship-suggestions"
          required
          placeholder={info.suggestions[0]}
          className={`w-40 ${field}`}
        />
        <datalist id="relationship-suggestions">
          {info.suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Farbe
        <input
          type="color"
          name="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-line bg-surface p-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Notiz (optional)
        <input type="text" name="label" placeholder="z. B. Kindheitsfreunde" className={field} />
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
