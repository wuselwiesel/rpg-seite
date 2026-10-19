"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { EmojiHtml } from "@/components/custom-emoji-provider";
import { autolinkHtml } from "@/lib/autolink";
import { RedaktionPostEditor } from "../redaktion-post-editor";

// Text eines Redaktions-Beitrags auf der Detailseite; die Autor:in kann ihn nachträglich bearbeiten
export function RedaktionPostBody({
  postId,
  content,
  contentHtml,
  hasMedia,
  isOwn,
  edited,
}: {
  postId: string;
  content: string;
  contentHtml: string;
  hasMedia: boolean;
  isOwn: boolean;
  edited: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState<{ raw: string; html: string } | null>(null);
  const [wasEdited, setWasEdited] = useState(edited);

  if (editing) {
    return (
      <RedaktionPostEditor
        postId={postId}
        content={text?.raw ?? content}
        hasMedia={hasMedia}
        onSaved={(next) => {
          setText({ raw: next, html: autolinkHtml(next, { tagHref: "/redaktion" }) });
          setWasEdited(true);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }
  return (
    <div>
      <EmojiHtml className="post-content text-fg-soft" html={text?.html ?? contentHtml} />
      {(isOwn || wasEdited) && (
        <p className="mt-1.5 flex items-center gap-3 text-xs text-muted">
          {wasEdited && <span>bearbeitet</span>}
          {isOwn && (
            <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 font-medium text-fg-soft hover:text-fg">
              <Pencil className="h-3 w-3" strokeWidth={2} />
              Bearbeiten
            </button>
          )}
        </p>
      )}
    </div>
  );
}
