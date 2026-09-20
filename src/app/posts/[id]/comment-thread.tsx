"use client";

import { useOptimistic, useState, useTransition, useActionState, useEffect, useRef } from "react";
import { Heart, Pencil, Trash2, X } from "lucide-react";
import { createComment, deleteComment, toggleLike, updateComment } from "../actions";
import { CharacterAvatar } from "@/components/character-avatar";
import { MentionText } from "@/components/mention-text";
import { MentionTextarea } from "@/components/mention-textarea";
import { timeAgoShort } from "@/lib/format";
import type { Character, Comment } from "@/lib/types";

function CommentHeart({ commentId, initialLiked, initialCount }: { commentId: string; initialLiked: boolean; initialCount: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        const next = !liked;
        setLiked(next);
        setCount((c) => c + (next ? 1 : -1));
        startTransition(async () => {
          await toggleLike({ commentId });
        });
      }}
      aria-pressed={liked}
      aria-label={liked ? "Gefällt mir nicht mehr" : "Gefällt mir"}
      className="flex shrink-0 flex-col items-center gap-0.5 self-start px-1 pt-1 text-muted transition active:scale-90"
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-[#ed4956] text-[#ed4956]" : ""}`} strokeWidth={liked ? 0 : 1.75} />
      {count > 0 && <span className="text-[11px] leading-none">{count}</span>}
    </button>
  );
}

function EditForm({ comment, postId, onDone }: { comment: Comment; postId: string; onDone: (content?: string) => void }) {
  const [content, setContent] = useState(comment.content);
  const [error, formAction, pending] = useActionState(updateComment.bind(null, comment.id, postId), null);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !error) onDone(content);
    wasPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, error]);
  return (
    <form action={formAction} className="mt-1 flex flex-col gap-2">
      <textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        className="rounded-md border border-line bg-app px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-3 text-xs">
        <button type="submit" disabled={pending} className="font-semibold text-accent disabled:opacity-50">
          {pending ? "Speichere..." : "Speichern"}
        </button>
        <button type="button" onClick={() => onDone()} className="text-muted hover:text-fg">
          Abbrechen
        </button>
      </div>
    </form>
  );
}

// Kommentare im Instagram-Stil: Herz pro Kommentar, Antworten darunter eingerückt, sofortiges Anzeigen beim Senden.
export function CommentThread({
  postId,
  comments,
  activeCharacter,
  myCharacterIds,
  mentionable,
}: {
  postId: string;
  comments: Comment[];
  activeCharacter: Character | null;
  myCharacterIds: string[];
  mentionable: Character[];
}) {
  const [optimistic, addOptimistic] = useOptimistic(comments, (state, c: Comment) => [...state, c]);
  const [replyTo, setReplyTo] = useState<{ rootId: string; name: string; characterId: string } | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const mine = new Set(myCharacterIds);

  const visible = optimistic.filter((c) => !removed.has(c.id));
  const roots = visible.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => visible.filter((c) => c.parent_id === id);

  async function submit(formData: FormData) {
    const content = String(formData.get("content") ?? "").trim();
    if (!content || !activeCharacter) return;
    formData.set("parent_id", replyTo?.rootId ?? "");
    addOptimistic({
      id: `tmp-${crypto.randomUUID()}`,
      post_id: postId,
      character_id: activeCharacter.id,
      content,
      parent_id: replyTo?.rootId ?? null,
      created_at: new Date().toISOString(),
      characters: activeCharacter,
      likes: [],
      pending: true,
    });
    if (replyTo) setExpanded((prev) => new Set(prev).add(replyTo.rootId));
    setResetKey((k) => k + 1);
    setReplyTo(null);
    setError(null);
    const err = await createComment(postId, null, formData);
    if (err) setError(err);
  }

  async function handleDelete(id: string) {
    if (!confirm("Diesen Kommentar wirklich löschen?")) return;
    setRemoved((prev) => new Set(prev).add(id));
    const err = await deleteComment(id, postId);
    if (err) {
      setRemoved((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      alert(err);
    }
  }

  function renderComment(c: Comment, rootId: string, isReply: boolean) {
    const own = mine.has(c.character_id);
    const text = overrides[c.id] ?? c.content;
    return (
      <div key={c.id} className={`flex gap-3 ${c.pending ? "opacity-60" : ""}`}>
        <CharacterAvatar name={c.characters?.name ?? "?"} avatarUrl={c.characters?.avatar_url} size={isReply ? 28 : 36} />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-fg">
            <span className="font-semibold">{c.characters?.username ?? c.characters?.name}</span>{" "}
            {editing === c.id ? null : <MentionText text={text} className="inline whitespace-pre-line text-fg-soft" />}
          </div>
          {editing === c.id ? (
            <EditForm
              comment={{ ...c, content: text }}
              postId={postId}
              onDone={(content) => {
                if (content !== undefined) setOverrides((prev) => ({ ...prev, [c.id]: content }));
                setEditing(null);
              }}
            />
          ) : (
            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
              <span>{c.pending ? "Wird gesendet..." : timeAgoShort(c.created_at)}</span>
              {!c.pending && (
                <button
                  type="button"
                  onClick={() =>
                    setReplyTo({ rootId, name: c.characters?.username ?? c.characters?.name ?? "", characterId: c.character_id })
                  }
                  className="font-semibold text-muted hover:text-fg"
                >
                  Antworten
                </button>
              )}
              {own && !c.pending && (
                <>
                  <button type="button" onClick={() => setEditing(c.id)} aria-label="Bearbeiten" className="hover:text-fg">
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => handleDelete(c.id)} aria-label="Löschen" className="hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {!c.pending && (
          <CommentHeart
            commentId={c.id}
            initialLiked={(c.likes ?? []).some((l) => l.character_id === activeCharacter?.id)}
            initialCount={c.likes?.length ?? 0}
          />
        )}
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

      <form
        action={submit}
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-2 border-t border-line bg-app px-4 py-3 lg:bottom-0"
      >
        {replyTo && (
          <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-fg-soft">
            <span>Antwort an {replyTo.name}</span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Antwort abbrechen" className="text-muted hover:text-fg">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
        <div className="flex items-start gap-3">
          {activeCharacter && <CharacterAvatar name={activeCharacter.name} avatarUrl={activeCharacter.avatar_url} size={36} />}
          <div className="min-w-0 flex-1">
            <MentionTextarea
              key={`${resetKey}-${replyTo?.rootId ?? ""}-${replyTo?.characterId ?? ""}`}
              name="content"
              characters={mentionable}
              required
              rows={1}
              autoFocus={Boolean(replyTo)}
              initialText={replyTo ? `@${replyTo.name.split(/\s+/)[0]} ` : ""}
              initialMentions={replyTo ? [{ name: replyTo.name.split(/\s+/)[0], id: replyTo.characterId }] : []}
              placeholder={`Kommentieren als ${activeCharacter?.name ?? "..."}`}
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
