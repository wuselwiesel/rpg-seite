"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { Dices, Pencil, Trash2 } from "lucide-react";
import { updateStoryEntry, deleteStoryEntry } from "../actions";
import { CharacterAvatar } from "@/components/character-avatar";
import { MentionText } from "@/components/mention-text";
import { formatDateTime } from "@/lib/format";
import type { StoryEntry } from "@/lib/types";

export function StoryEntryItem({
  entry,
  storyPostId,
  canManage,
}: {
  entry: StoryEntry;
  storyPostId: string;
  canManage: boolean;
}) {
  const isRoll = !!entry.roll_label;
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const updateAction = updateStoryEntry.bind(null, entry.id, storyPostId);
  const [error, formAction, pending] = useActionState(updateAction, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) setEditing(false);
    wasPending.current = pending;
  }, [pending, error]);

  async function handleDelete() {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    const err = await deleteStoryEntry(entry.id, storyPostId);
    if (err) alert(err);
  }

  return (
    <div className="flex gap-3">
      <CharacterAvatar
        name={entry.characters?.name ?? "?"}
        avatarUrl={entry.characters?.avatar_url}
        size={32}
      />
      <div className="flex-1 rounded-lg border border-line bg-surface px-4 py-2">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-medium text-fg">{entry.characters?.name}</p>
            <p className="text-xs text-muted">
              {formatDateTime(entry.created_at)}
              {entry.updated_at && " · bearbeitet"}
            </p>
          </div>
          {canManage && !editing && (
            <div className="flex shrink-0 items-center gap-1">
              {!isRoll && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  title="Bearbeiten"
                  className="rounded p-1 text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                title="Löschen"
                className="rounded p-1 text-muted transition hover:bg-surface-2 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <form action={formAction} className="flex flex-col gap-2">
            <textarea
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="rounded-md border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            />
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-accent-strong px-3 py-1 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Speichere..." : "Speichern"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setContent(entry.content);
                }}
                className="rounded-md px-3 py-1 text-xs text-muted hover:text-fg"
              >
                Abbrechen
              </button>
            </div>
          </form>
        ) : isRoll ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Dices className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
            <span className="text-fg-soft">
              würfelt auf <span className="font-medium text-fg">„{entry.roll_label}“</span>
              {entry.roll_target_character?.name && (
                <>
                  {" "}
                  gegen <span className="font-medium text-fg">{entry.roll_target_character.name}</span>
                </>
              )}
              : {entry.roll_result}/{entry.roll_value} (W{entry.roll_die})
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                entry.roll_success
                  ? "bg-green-500/15 text-green-700 dark:text-green-400"
                  : "bg-red-500/15 text-red-700 dark:text-red-400"
              }`}
            >
              {entry.roll_success ? "Erfolg" : "Misserfolg"}
            </span>
          </div>
        ) : (
          <MentionText text={entry.content} className="whitespace-pre-line text-sm text-fg-soft" />
        )}
      </div>
    </div>
  );
}
