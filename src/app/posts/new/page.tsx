"use client";

import { useActionState } from "react";
import { createPost } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useDraft } from "@/lib/use-draft";

export default function NewPostPage() {
  const [error, formAction, pending] = useActionState(createPost, null);
  const { draft, restored, update, clear } = useDraft("draft:post-new", { content: "" });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 font-serif text-3xl text-fg">Neuer Beitrag</h1>

      {/* createPost redirect()s on success, which navigates away before any
          pending/error transition would fire client-side - so the draft is
          cleared optimistically on submit rather than after confirmation. */}
      <form action={formAction} onSubmit={() => clear()} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-sm text-fg-soft">
          Inhalt
          {restored && (
            <RichTextEditor
              key="restored"
              name="content"
              initialContent={draft.content}
              onChange={(html) => update({ content: html })}
            />
          )}
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
