"use client";

import { EmojiText } from "@/components/custom-emoji-provider";
import Link from "next/link";
import { useOptimistic, useState } from "react";
import { Trash2, X } from "lucide-react";
import { createRedaktionComment, deleteRedaktionComment } from "../actions";
import { CharacterAvatar } from "@/components/character-avatar";
import { timeAgoShort } from "@/lib/format";
import type { RedaktionComment } from "@/lib/types";

export function RedaktionCommentThread({
  postId,
  comments,
  currentUserId,
}: {
  postId: string;
  comments: RedaktionComment[];
  currentUserId: string;
}) {
  const [optimistic, addOptimistic] = useOptimistic(comments, (state, c: RedaktionComment) => [...state, c]);
  const [replyTo, setReplyTo] = useState<{ rootId: string; name: string } | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const visible = optimistic.filter((c) => !removed.has(c.id));
  const roots = visible.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => visible.filter((c) => c.parent_id === id);

  async function submit(formData: FormData) {
    const content = String(formData.get("content") ?? "").trim();
    if (!content) return;
    formData.set("parent_id", replyTo?.rootId ?? "");
    addOptimistic({
      id: `tmp-${crypto.randomUUID()}`,
      post_id: postId,
      author_id: currentUserId,
      content,
      parent_id: replyTo?.rootId ?? null,
      created_at: new Date().toISOString(),
      updated_at: null,
      author: null,
    });
    if (replyTo) setExpanded((prev) => new Set(prev).add(replyTo.rootId));
    setResetKey((k) => k + 1);
    setReplyTo(null);
    setError(null);
    const err = await createRedaktionComment(postId, null, formData);
    if (err) setError(err);
  }

  async function handleDelete(id: string) {
    if (!confirm("Diesen Kommentar wirklich löschen?")) return;
    setRemoved((prev) => new Set(prev).add(id));
    const err = await deleteRedaktionComment(id, postId);
    if (err) {
      setRemoved((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      alert(err);
    }
  }

  function renderComment(c: RedaktionComment, rootId: string, isReply: boolean) {
    const own = c.author_id === currentUserId;
    const name = c.author?.nickname || c.author?.username || "Jemand";
    return (
      <div key={c.id} className="flex gap-3">
        <Link href={`/redaktion/profil/${c.author_id}`} className="shrink-0">
          <CharacterAvatar name={name} avatarUrl={c.author?.avatar_url} size={isReply ? 28 : 36} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-fg">
            <Link href={`/redaktion/profil/${c.author_id}`} className="font-semibold hover:underline">
              {name}
            </Link>{" "}
            <span className="whitespace-pre-line text-fg-soft">
              <EmojiText text={c.content} />
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
            <span>{timeAgoShort(c.created_at)}</span>
            <button
              type="button"
              onClick={() => setReplyTo({ rootId, name })}
              className="font-semibold text-muted hover:text-fg"
            >
              Antworten
            </button>
            {own && (
              <button type="button" onClick={() => handleDelete(c.id)} aria-label="Löschen" className="hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 font-serif text-xl text-fg">Kommentare {visible.length ? `(${visible.length})` : ""}</h2>

      <div className="mb-6 flex flex-col gap-5">
        {roots.length === 0 && <p className="text-sm text-muted">Noch keine Kommentare. Schreib den ersten.</p>}
        {roots.map((root) => {
          const replies = repliesOf(root.id);
          const open = expanded.has(root.id);
          return (
            <div key={root.id} className="flex flex-col gap-3">
              {renderComment(root, root.id, false)}
              {replies.length > 0 && (
                <div className="ml-12 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(root.id)) next.delete(root.id);
                        else next.add(root.id);
                        return next;
                      })
                    }
                    className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-fg"
                  >
                    <span className="h-px w-6 bg-line" />
                    {open ? "Antworten ausblenden" : `Antworten ansehen (${replies.length})`}
                  </button>
                  {open && replies.map((r) => renderComment(r, root.id, true))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form key={resetKey} action={submit} className="flex flex-col gap-2 border-t border-line pt-3">
        {replyTo && (
          <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-fg-soft">
            <span>Antwort an {replyTo.name}</span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Antwort abbrechen" className="text-muted hover:text-fg">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <textarea
              name="content"
              required
              rows={1}
              placeholder="Kommentieren..."
              className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 self-center rounded-md px-2 py-2 text-sm font-semibold text-accent transition hover:opacity-80"
          >
            Posten
          </button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </div>
  );
}
