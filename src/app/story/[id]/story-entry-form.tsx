"use client";

import { useActionState } from "react";
import { createStoryEntry } from "../actions";

export function StoryEntryForm({
  storyPostId,
  worldId,
  characterName,
}: {
  storyPostId: string;
  worldId: string;
  characterName: string;
}) {
  const action = createStoryEntry.bind(null, storyPostId, worldId);
  const [error, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <textarea
        name="content"
        required
        rows={4}
        placeholder={`Schreib die Geschichte weiter als ${characterName}...`}
        className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Sende..." : "Weiterschreiben"}
      </button>
    </form>
  );
}
