"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createCharacter } from "../actions";
import { AvatarUpload } from "@/components/avatar-upload";

export default function NewCharacterPage() {
  const [error, formAction, pending] = useActionState(createCharacter, null);
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";
  const [name, setName] = useState("");

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-stone-100">
        {isWelcome ? "Willkommen! Erschaffe deinen ersten Charakter" : "Neuer Charakter"}
      </h1>
      <p className="mb-6 text-sm text-stone-400">
        Du kannst später jederzeit weitere Charaktere anlegen und zwischen ihnen wechseln.
      </p>

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
          Avatar (optional)
          <AvatarUpload name="avatar_url" displayName={name || "?"} />
        </div>
        <label className="flex flex-col gap-1 text-sm text-stone-300">
          Kurzbeschreibung (optional)
          <textarea
            name="bio"
            rows={4}
            className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 outline-none focus:border-amber-600"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-amber-700 px-4 py-2 font-medium text-stone-50 transition hover:bg-amber-600 disabled:opacity-50"
        >
          {pending ? "Erschaffe..." : "Charakter erschaffen"}
        </button>
      </form>
    </div>
  );
}
