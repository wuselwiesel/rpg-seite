"use client";

import { EmojiHtml } from "@/components/custom-emoji-provider";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteStoryPost, updateStoryPost } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";

// Titel, Ort/Zeit und Text der Szene. Die Autor:in kann sie hier bearbeiten oder löschen;
// als Erzähler:in erscheint sie neutral, ohne Charakter.
export function StoryPostBody({
  storyPostId,
  title,
  rawContent,
  displayHtml,
  narrator,
  canEdit,
  metaSlot,
}: {
  storyPostId: string;
  title: string;
  rawContent: string;
  displayHtml: string;
  narrator: boolean;
  canEdit: boolean;
  metaSlot: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [narratorOn, setNarratorOn] = useState(narrator);
  const [draftTitle, setDraftTitle] = useState(title);
  const [error, formAction, pending] = useActionState(updateStoryPost.bind(null, storyPostId), null);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) setEditing(false);
    wasPending.current = pending;
  }, [pending, error]);

  function handleDelete() {
    if (!window.confirm("Diese Szene samt allen Fortsetzungen endgültig löschen?")) return;
    setDeleteError(null);
    startDelete(async () => {
      const err = await deleteStoryPost(storyPostId);
      if (err) setDeleteError(err);
    });
  }

  if (editing) {
    return (
      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="text"
          name="title"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          required
          aria-label="Titel"
          className="rounded-md border border-line bg-app px-3 py-2 font-serif text-2xl text-fg outline-none focus:border-accent"
        />
        <RichTextEditor name="content" initialContent={rawContent} placeholder="Erzähl, was gerade passiert..." allowFontSelection />
        <label className="flex items-center gap-2 text-sm text-fg-soft">
          <input
            type="checkbox"
            name="narrator"
            checked={narratorOn}
            onChange={(e) => setNarratorOn(e.target.checked)}
            className="rounded border-line"
          />
          Als Erzähler:in (neutral, ohne Charakter)
        </label>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Speichert..." : "Speichern"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md px-4 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2"
          >
            Abbrechen
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h1 className="font-serif text-3xl text-fg">{title}</h1>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Szene bearbeiten"
              title="Bearbeiten"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg active:scale-90"
            >
              <Pencil className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Szene löschen"
              title="Löschen"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-500 active:scale-90 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
      {deleteError && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
      {metaSlot}
      <EmojiHtml className="post-content text-fg-soft" html={displayHtml} />
    </>
  );
}
