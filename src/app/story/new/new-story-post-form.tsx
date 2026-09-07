"use client";

import { useActionState, useState } from "react";
import { createStoryPost } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useDraft } from "@/lib/use-draft";
import type { StoryArc } from "@/lib/types";

const NEW_ARC_VALUE = "__new__";

export function NewStoryPostForm({ arcs }: { arcs: StoryArc[] }) {
  const [error, formAction, pending] = useActionState(createStoryPost, null);
  const [arcChoice, setArcChoice] = useState("");
  const { draft, restored, update, clear } = useDraft("draft:story-new", { title: "", content: "" });

  return (
    // createStoryPost redirect()s on success, which navigates away before any
    // pending/error transition would fire client-side - so the draft is
    // cleared optimistically on submit rather than after confirmation.
    <form action={formAction} onSubmit={() => clear()} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Titel
        <input
          type="text"
          name="title"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          required
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>
      <div className="flex flex-col gap-1 text-sm text-fg-soft">
        Inhalt
        {restored && (
          <RichTextEditor
            key="restored"
            name="content"
            initialContent={draft.content}
            placeholder="Erzähl, was gerade passiert..."
            onChange={(html) => update({ content: html })}
          />
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Handlungsstrang (optional)
        <select
          value={arcChoice}
          onChange={(e) => setArcChoice(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        >
          <option value="">Keinem Handlungsstrang zuordnen</option>
          {arcs.map((arc) => (
            <option key={arc.id} value={arc.id}>
              {arc.name}
            </option>
          ))}
          <option value={NEW_ARC_VALUE}>+ Neuen Handlungsstrang erschaffen</option>
        </select>
      </label>

      {arcChoice === NEW_ARC_VALUE ? (
        <input
          type="text"
          name="new_arc_name"
          required
          placeholder="z. B. Der Sturm-Arc"
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      ) : (
        <input type="hidden" name="arc_id" value={arcChoice} />
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Veröffentliche..." : "Szene beginnen"}
      </button>
    </form>
  );
}
