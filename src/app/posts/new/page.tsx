"use client";

import { useActionState } from "react";
import { createPost } from "../actions";

export default function NewPostPage() {
  const [error, formAction, pending] = useActionState(createPost, null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 font-serif text-3xl text-stone-100">Neuer Eintrag</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-stone-300">
          Titel
          <input
            type="text"
            name="title"
            required
            className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 outline-none focus:border-amber-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-stone-300">
          Inhalt
          <textarea
            name="content"
            required
            rows={12}
            className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 font-serif text-lg leading-relaxed text-stone-100 outline-none focus:border-amber-600"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 self-start rounded-md bg-amber-700 px-5 py-2 font-medium text-stone-50 transition hover:bg-amber-600 disabled:opacity-50"
        >
          {pending ? "Veröffentliche..." : "Veröffentlichen"}
        </button>
      </form>
    </div>
  );
}
