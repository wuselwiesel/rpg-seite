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
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Name
        <input
          type="text"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 outline-none focus:border-amber-600"
        />
      </label>
      <div className="flex flex-col gap-1 text-sm text-stone-300">
        Avatar
        <AvatarUpload
          name="avatar_url"
          displayName={name || "?"}
          initialUrl={character.avatar_url}
        />
      </div>
      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Kurzbeschreibung (optional)
        <textarea
          name="bio"
          rows={4}
          defaultValue={character.bio ?? ""}
          className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 outline-none focus:border-amber-600"
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-md bg-amber-700 px-5 py-2 font-medium text-stone-50 transition hover:bg-amber-600 disabled:opacity-50"
      >
        {pending ? "Speichere..." : "Speichern"}
      </button>
    </form>
  );
}
