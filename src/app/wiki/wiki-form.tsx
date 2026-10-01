"use client";

import { useActionState } from "react";
import { createWikiPage, updateWikiPage } from "./actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { AvatarUpload } from "@/components/avatar-upload";
import { useDraft } from "@/lib/use-draft";
import type { WikiCategory, WikiPage } from "@/lib/types";

const CATEGORY_LABELS: Record<WikiCategory, string> = {
  ort: "Ort",
  npc: "NPC",
  fraktion: "Fraktion",
  sonstiges: "Sonstiges",
};

export function WikiForm({ page }: { page?: WikiPage }) {
  const action = page ? updateWikiPage.bind(null, page.id) : createWikiPage;
  const [error, formAction, pending] = useActionState(action, null);
  // Neue Einträge: Entwurf im Browser merken (Bearbeiten lädt immer den gespeicherten Stand).
  const { draft, restored, update, clear } = useDraft("draft:wiki-new", { title: "", aliases: "", content: "" });
  const isNew = !page;

  return (
    <form action={formAction} onSubmit={() => isNew && clear()} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Titelbild (optional)
        <AvatarUpload
          name="cover_image_url"
          initialUrl={page?.cover_image_url}
          displayName={page?.title ?? "Wiki-Eintrag"}
          bucket="wiki-covers"
          variant="cover"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Titel
        <input
          type="text"
          name="title"
          {...(isNew ? { value: draft.title, onChange: (e: React.ChangeEvent<HTMLInputElement>) => update({ title: e.target.value }) } : { defaultValue: page?.title })}
          required
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Kategorie
        <select
          name="category"
          defaultValue={page?.category ?? "sonstiges"}
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        >
          {(Object.keys(CATEGORY_LABELS) as WikiCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Alternative Namen (optional)
        <input
          type="text"
          name="aliases"
          {...(isNew ? { value: draft.aliases, onChange: (e: React.ChangeEvent<HTMLInputElement>) => update({ aliases: e.target.value }) } : { defaultValue: page?.aliases?.join(", ") })}
          placeholder="z. B. Kapelle, alte Kapelle"
          className="rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent"
        />
        <span className="text-xs text-muted">
          Wenn diese Wörter in einem Beitrag oder einer Szene vorkommen, werden sie automatisch mit diesem Eintrag
          verlinkt (mit Kommas trennen).
        </span>
      </label>

      <div className="flex flex-col gap-1 text-sm text-fg-soft">
        Inhalt
        {(restored || !isNew) && (
          <RichTextEditor
            name="content"
            initialContent={isNew ? draft.content : page?.content}
            onChange={isNew ? (html) => update({ content: html }) : undefined}
            placeholder="Beschreibung, Details, Geheimnisse..."
            allowFontSelection
          />
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichere..." : page ? "Speichern" : "Eintrag erstellen"}
      </button>
    </form>
  );
}
