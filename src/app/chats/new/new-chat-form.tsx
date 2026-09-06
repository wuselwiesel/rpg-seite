"use client";

import { useActionState, useState } from "react";
import { createChat } from "../actions";
import type { Character } from "@/lib/types";

export function NewChatForm({ characters }: { characters: Character[] }) {
  const [error, formAction, pending] = useActionState(createChat, null);
  const [selected, setSelected] = useState<string[]>([]);
  const isGroup = selected.length > 1;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-stone-300">Mit wem?</p>
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md border border-stone-700 p-2">
          {characters.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-stone-200 hover:bg-stone-800"
            >
              <input
                type="checkbox"
                name="participants"
                value={c.id}
                checked={selected.includes(c.id)}
                onChange={(e) =>
                  setSelected((prev) =>
                    e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                  )
                }
              />
              {c.name}
            </label>
          ))}
          {characters.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-stone-500">
              Keine anderen Charaktere vorhanden.
            </p>
          )}
        </div>
      </div>

      {isGroup && (
        <label className="flex flex-col gap-1 text-sm text-stone-300">
          Gruppenname
          <input
            type="text"
            name="name"
            required={isGroup}
            className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 outline-none focus:border-amber-600"
          />
        </label>
      )}
      {isGroup && <input type="hidden" name="is_group" value="on" />}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending || selected.length === 0}
        className="self-start rounded-md bg-amber-700 px-5 py-2 font-medium text-stone-50 transition hover:bg-amber-600 disabled:opacity-50"
      >
        {pending ? "Erstelle..." : "Chat starten"}
      </button>
    </form>
  );
}
