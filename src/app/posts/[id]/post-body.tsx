"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updatePostContent } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { Character } from "@/lib/types";

// Inhalt/Bildunterschrift eines eigenen Beitrags lässt sich nachträglich bearbeiten - bei Foto-/
// Video-Beiträgen nur als Klartext (wie beim Erstellen), bei reinen Text-Beiträgen im vollen
// RichTextEditor inkl. Schriftart-Auswahl und @-Erwähnungen.
export function PostBody({
  postId,
  contentHtml,
  rawContent,
  hasMedia,
  isOwnPost,
  mentionable,
}: {
  postId: string;
  contentHtml: string;
  rawContent: string;
  hasMedia: boolean;
  isOwnPost: boolean;
  mentionable: Character[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, formAction, pending] = useActionState(updatePostContent.bind(null, postId), null);
  const [caption, setCaption] = useState(rawContent);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) {
      router.refresh();
      setEditing(false);
    }
    wasPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, error]);

  if (!editing) {
    return (
      <div>
        <div className="post-content text-fg-soft" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        {isOwnPost && (
          <button
            type="button"
            onClick={() => {
              setCaption(rawContent);
              setEditing(true);
            }}
            className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-soft hover:text-fg"
          >
            <Pencil className="h-3 w-3" strokeWidth={2} />
            Bearbeiten
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {hasMedia ? (
        <textarea
          name="content"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          maxLength={2000}
          className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent"
        />
      ) : (
        <RichTextEditor name="content" initialContent={rawContent} mentionCharacters={mentionable} allowFontSelection />
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-3 text-sm">
        <button type="submit" disabled={pending} className="font-semibold text-accent disabled:opacity-50">
          {pending ? "Speichere..." : "Speichern"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-muted hover:text-fg">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
