"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createComment } from "../actions";
import { MentionTextarea } from "@/components/mention-textarea";
import type { Character } from "@/lib/types";

export function CommentForm({
  postId,
  characters,
}: {
  postId: string;
  characters: Character[];
}) {
  const action = createComment.bind(null, postId);
  const [error, formAction, pending] = useActionState(action, null);
  const [resetKey, setResetKey] = useState(0);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      setResetKey((k) => k + 1);
    }
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <MentionTextarea
        key={resetKey}
        name="content"
        characters={characters}
        required
        rows={3}
        placeholder="Antworte als dein aktiver Charakter... (@ um Charaktere zu markieren)"
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
