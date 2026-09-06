"use client";

import { useActionState } from "react";
import { createPost } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";

export default function NewPostPage() {
  const [error, formAction, pending] = useActionState(createPost, null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 font-serif text-3xl text-fg">Neuer Eintrag</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Titel
          <input
            type="text"
            name="title"
            required
            className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
          />
        </label>
        <div className="flex flex-col gap-1 text-sm text-fg-soft">
          Inhalt
          <RichTextEditor name="content" />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Veröffentliche..." : "Veröffentlichen"}
        </button>
      </form>
    </div>
  );
}
