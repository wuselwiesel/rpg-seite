"use client";

import { useEffect, useState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { htmlCaptionToPlainText } from "@/lib/strip-html";
import type { Character } from "@/lib/types";
import { loadRedaktionMentionables, updateRedaktionPost } from "./actions";

// Eigenen Beitrag bearbeiten: Foto-/Video-Beiträge nur die Bildunterschrift (Klartext), Text-Beiträge im vollen Editor mit Schrift und @-Erwähnungen.
export function RedaktionPostEditor({
  postId,
  content,
  hasMedia,
  onSaved,
  onCancel,
}: {
  postId: string;
  content: string;
  hasMedia: boolean;
  onSaved: (content: string, updatedAt: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(() => (hasMedia ? htmlCaptionToPlainText(content) : content));
  const [mentionable, setMentionable] = useState<Character[] | null>(hasMedia ? [] : null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (hasMedia) return;
    let alive = true;
    void loadRedaktionMentionables().then((list) => alive && setMentionable(list as Character[]));
    return () => {
      alive = false;
    };
  }, [hasMedia]);

  async function save() {
    setPending(true);
    setError(null);
    const res = await updateRedaktionPost(postId, text);
    setPending(false);
    if ("error" in res) return setError(res.error);
    onSaved(res.content, res.updatedAt);
  }

  return (
    <div className="flex flex-col gap-2">
      {hasMedia ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={2000}
          aria-label="Bildunterschrift"
          autoFocus
          className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent"
        />
      ) : mentionable ? (
        <RichTextEditor name="content" initialContent={content} onChange={setText} mentionCharacters={mentionable} allowFontSelection />
      ) : (
        <p className="text-sm text-muted">Lädt …</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-3 text-sm">
        <button type="button" onClick={() => void save()} disabled={pending || (!hasMedia && !mentionable)} className="font-semibold text-accent disabled:opacity-50">
          {pending ? "Speichere …" : "Speichern"}
        </button>
        <button type="button" onClick={onCancel} className="text-muted hover:text-fg">
          Abbrechen
        </button>
      </div>
    </div>
  );
}
