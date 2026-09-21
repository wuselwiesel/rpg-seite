"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createStoryEntry } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useDraft } from "@/lib/use-draft";
import type { Character } from "@/lib/types";

export function StoryEntryForm({
  storyPostId,
  worldId,
  characterName,
  characters,
  participantIds,
  narrator,
  showToolbar,
  writerId,
}: {
  storyPostId: string;
  worldId: string;
  characterName: string;
  characters: Character[];
  participantIds: string[];
  narrator: boolean;
  showToolbar: boolean;
  writerId: string;
}) {
  const selectable = characters.filter((c) => c.id !== writerId);
  const involved = selectable.filter((c) => participantIds.includes(c.id));
  const others = selectable.filter((c) => !participantIds.includes(c.id));
  const action = createStoryEntry.bind(null, storyPostId, worldId);
  const [error, formAction, pending] = useActionState(action, null);
  const [resetKey, setResetKey] = useState(0);
  const wasPending = useRef(false);
  const { draft, restored, update, clear } = useDraft(`draft:entry:${storyPostId}`, { content: "" });

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      clear();
      update({ content: "" });
      setResetKey((k) => k + 1);
    }
    wasPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, error]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="character_id" value={writerId} />
      {narrator && <input type="hidden" name="narrator" value="on" />}
      {restored && (
      <RichTextEditor
        key={resetKey}
        name="content"
        // Nach dem Absenden startet der Editor leer; der (noch nicht aktualisierte) Entwurf darf nicht zurückkehren.
        initialContent={resetKey > 0 ? "" : draft.content}
        onChange={(html) => update({ content: html })}
        mentionCharacters={characters}
        minHeight={100}
        showToolbar={showToolbar}
        placeholder={
          narrator
            ? "Erzähle, was geschieht – als Erzähler:in, ohne Charakter..."
            : `Schreib die Geschichte weiter als ${characterName}... (@ um Charaktere zu markieren)`
        }
      />
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Sende..." : narrator ? "Als Erzähler:in senden" : "Weiterschreiben"}
        </button>
        {selectable.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Danach dran:
            <select
              name="next_character_id"
              defaultValue=""
              className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-fg-soft outline-none focus:border-accent"
            >
              <option value="">automatisch (zuletzt Schreibende:r)</option>
              {involved.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {others.length > 0 && (
                <optgroup label="Weitere">
                  {others.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="__none__">niemand bestimmtes</option>
            </select>
          </label>
        )}
      </div>
    </form>
  );
}
