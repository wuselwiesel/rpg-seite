"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { updateComment, deleteComment } from "../actions";
import { CharacterAvatar } from "@/components/character-avatar";
import { MentionText } from "@/components/mention-text";
import { LikeButton } from "@/components/like-button";
import { formatDateTime } from "@/lib/format";
import type { Comment } from "@/lib/types";

export function CommentItem({
  comment,
  postId,
  canManage,
  initialLiked,
  initialLikeCount,
}: {
  comment: Comment;
  postId: string;
  canManage: boolean;
  initialLiked: boolean;
  initialLikeCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const updateAction = updateComment.bind(null, comment.id, postId);
  const [error, formAction, pending] = useActionState(updateAction, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !error) setEditing(false);
    wasPending.current = pending;
  }, [pending, error]);

  async function handleDelete() {
    if (!confirm("Diesen Kommentar wirklich löschen?")) return;
    const err = await deleteComment(comment.id, postId);
    if (err) alert(err);
  }

  return (
    <div className="flex gap-3">
      <CharacterAvatar
        name={comment.characters?.name ?? "?"}
        avatarUrl={comment.characters?.avatar_url}
        size={32}
      />
      <div className="flex-1 rounded-lg border border-line bg-surface px-4 py-2">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-medium text-fg">{comment.characters?.name}</p>
            <p className="text-xs text-muted">
              {formatDateTime(comment.created_at)}
              {comment.updated_at && " · bearbeitet"}
            </p>
          </div>
          {canManage && !editing && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Bearbeiten"
                className="rounded p-1 text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
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
              rows={2}
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
                  setContent(comment.content);
                }}
                className="rounded-md px-3 py-1 text-xs text-muted hover:text-fg"
              >
                Abbrechen
              </button>
            </div>
          </form>
        ) : (
          <>
            <MentionText text={comment.content} className="whitespace-pre-line text-sm text-fg-soft" />
            <div className="mt-2">
              <LikeButton
                target={{ commentId: comment.id }}
                initialLiked={initialLiked}
                initialCount={initialLikeCount}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
