"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { Dices, Pencil, Trash2, Type } from "lucide-react";
import { updateStoryEntry, deleteStoryEntry } from "../actions";
import { CharacterAvatar } from "@/components/character-avatar";
import { NarratorAvatar } from "@/components/narrator-avatar";
import { RichTextEditor } from "@/components/rich-text-editor";
import { formatDateTime } from "@/lib/format";
import type { Character, StoryEntry } from "@/lib/types";

export function StoryEntryItem({
  entry,
  storyPostId,
  canManage,
  mentionCharacters,
  chapterNumber,
  displayHtml,
}: {
  entry: StoryEntry;
  storyPostId: string;
  canManage: boolean;
  mentionCharacters: Character[];
  chapterNumber?: number;
  // Mit Wiki-Links und Hashtag-Links angereicherte Fassung von entry.content.
  displayHtml?: string;
}) {
  const isRoll = !!entry.roll_label;
  const isNarrator = entry.kind === "narrator";
  const [editing, setEditing] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
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

  if (entry.kind === "chapter") {
    return (
      <div id={`kapitel-${chapterNumber}`} className="group my-4 scroll-mt-20 text-center">
        <div className="flex items-center gap-3 text-muted">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs">Kapitel {chapterNumber}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <h3 className="mt-2 font-serif text-2xl text-fg">{entry.chapter_title ?? entry.content}</h3>
        {entry.chapter_summary && (
          <p className="mx-auto mt-1 max-w-md text-sm italic text-muted">{entry.chapter_summary}</p>
        )}
        {canManage && (
          <button
            type="button"
            onClick={handleDelete}
            className="mt-1 text-xs text-muted transition hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
          >
            Kapitel entfernen
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {isNarrator ? (
        <NarratorAvatar size={32} />
      ) : (
        <CharacterAvatar
          name={entry.characters?.name ?? "?"}
          avatarUrl={entry.characters?.avatar_url}
          size={32}
        />
      )}
      <div className="flex-1 rounded-lg border border-line bg-surface px-4 py-2">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-medium text-fg">{isNarrator ? "Erzähler:in" : entry.characters?.name}</p>
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
            <RichTextEditor
              name="content"
              initialContent={entry.content}
              mentionCharacters={mentionCharacters}
              minHeight={80}
              showToolbar={showToolbar}
            />
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-accent-strong px-3 py-1 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Speichere..." : "Speichern"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md px-3 py-1 text-xs text-muted hover:text-fg"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => setShowToolbar((v) => !v)}
                title={showToolbar ? "Formatierung ausblenden" : "Formatierung anzeigen"}
                className={`ml-auto flex h-7 w-7 items-center justify-center rounded-full transition ${
                  showToolbar ? "bg-surface-2 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Type className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </form>
        ) : isRoll ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Dices className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
            <span className="text-fg-soft">
              würfelt auf <span className="font-medium text-fg">„{entry.roll_label}“</span>
              {entry.roll_stat_name && <span className="text-muted"> ({entry.roll_stat_name})</span>}
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
          // Bereits serverseitig sanitisiert (siehe createStoryEntry/updateStoryEntry) -
          // Einträge kommen nie ungeprüft vom Client in die Datenbank.
          <div className="post-content text-sm text-fg-soft" dangerouslySetInnerHTML={{ __html: displayHtml ?? entry.content }} />
        )}
      </div>
    </div>
  );
}
