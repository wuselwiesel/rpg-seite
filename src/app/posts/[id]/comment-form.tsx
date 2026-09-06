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
        className="rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-amber-600"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-amber-700 px-4 py-1.5 text-sm font-medium text-stone-50 transition hover:bg-amber-600 disabled:opacity-50"
      >
        {pending ? "Sende..." : "Kommentieren"}
      </button>
    </form>
  );
}
