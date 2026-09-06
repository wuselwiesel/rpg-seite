"use client";

import { useActionState } from "react";
import { createComment } from "../actions";

export function CommentForm({ postId }: { postId: string }) {
  const action = createComment.bind(null, postId);
  const [error, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <textarea
        name="content"
        required
        rows={3}
        placeholder="Antworte als dein aktiver Charakter..."
        className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Sende..." : "Kommentieren"}
      </button>
    </form>
  );
}
