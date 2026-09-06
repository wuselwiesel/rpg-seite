"use client";

import { useActionState, useState } from "react";
import { updateCharacter } from "../../actions";
import { AvatarUpload } from "@/components/avatar-upload";
import type { Character } from "@/lib/types";

export function EditCharacterForm({ character }: { character: Character }) {
  const action = updateCharacter.bind(null, character.id);
  const [error, formAction, pending] = useActionState(action, null);
  const [name, setName] = useState(character.name);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Name
        <input
          type="text"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>
      <div className="flex flex-col gap-1 text-sm text-fg-soft">
        Avatar
        <AvatarUpload
          name="avatar_url"
          displayName={name || "?"}
          initialUrl={character.avatar_url}
        />
      </div>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Kurzbeschreibung (optional)
        <textarea
          name="bio"
          rows={4}
          defaultValue={character.bio ?? ""}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Charakterbogen-Link (optional)
        <input
          type="url"
          name="sheet_url"
          defaultValue={character.sheet_url ?? ""}
          placeholder="Freigabelink aus Charakterbogen"
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichere..." : "Speichern"}
      </button>
    </form>
  );
}
