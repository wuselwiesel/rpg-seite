"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createStoryEntry } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { Character } from "@/lib/types";

export function StoryEntryForm({
  storyPostId,
  worldId,
  characterName,
  characters,
  showToolbar,
}: {
  storyPostId: string;
  worldId: string;
  characterName: string;
  characters: Character[];
  showToolbar: boolean;
}) {
  const action = createStoryEntry.bind(null, storyPostId, worldId);
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
      <RichTextEditor
        key={resetKey}
        name="content"
        mentionCharacters={characters}
        minHeight={100}
        showToolbar={showToolbar}
        placeholder={`Schreib die Geschichte weiter als ${characterName}... (@ um Charaktere zu markieren)`}
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
