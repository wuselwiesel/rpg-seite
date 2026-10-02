"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createWikiPage, updateWikiPage } from "./actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { AvatarUpload } from "@/components/avatar-upload";
import { GalleryUpload } from "@/components/gallery-upload";
import { ProfileFieldsEditor } from "@/components/profile-fields-editor";
import { useDraft } from "@/lib/use-draft";
import { WIKI_TEMPLATES } from "@/lib/wiki-templates";
import type { ProfileField } from "@/lib/profile-fields";
import type { FolderOption, PageOption } from "@/lib/wiki-tree";
import type { WikiPage } from "@/lib/types";

const input = "rounded-lg border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent";
const card = "flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 @xl:p-6";

export function WikiForm({
  page,
  folders,
  parentChoices,
  linkTargets,
  defaults,
}: {
  page?: WikiPage;
  folders: FolderOption[];
  parentChoices: PageOption[];
  linkTargets: { id: string; title: string }[];
  defaults?: { title?: string; folder?: string; parent?: string };
}) {
  const action = page ? updateWikiPage.bind(null, page.id) : createWikiPage;
  const [error, formAction, pending] = useActionState(action, null);
  const isNew = !page;
  // Neue Einträge: Entwurf im Browser merken (Bearbeiten lädt immer den gespeicherten Stand).
  const { draft, restored, update, clear } = useDraft("draft:wiki-new", {
    title: defaults?.title ?? "",
    lead: "",
    aliases: "",
    content: "",
  });
  const [parent, setParent] = useState(page?.parent_page_id ?? defaults?.parent ?? "");
  const [folder, setFolder] = useState(page?.folder_id ?? defaults?.folder ?? "");
  const [fieldRows, setFieldRows] = useState<ProfileField[]>(page?.fields ?? []);
  const [fieldsKey, setFieldsKey] = useState(0);

  function applyTemplate(titles: string[]) {
    setFieldRows(titles.map((title) => ({ icon: "", title, text: "" })));
    setFieldsKey((k) => k + 1);
  }

  const parentTitle = parentChoices.find((p) => p.id === parent)?.label;

  return (
    <form action={formAction} onSubmit={() => isNew && clear()} className="flex flex-col gap-5">
      <section className={card}>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Titel
          <input
            type="text"
            name="title"
            required
            maxLength={120}
            {...(isNew
              ? { value: draft.title, onChange: (e: React.ChangeEvent<HTMLInputElement>) => update({ title: e.target.value }) }
              : { defaultValue: page?.title })}
            className={`${input} font-serif text-2xl`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Kurztext
          <input
            type="text"
            name="lead"
            maxLength={300}
            placeholder="Ein bis zwei Sätze für Übersicht, Suche und Vorschau"
            {...(isNew
              ? { value: draft.lead, onChange: (e: React.ChangeEvent<HTMLInputElement>) => update({ lead: e.target.value }) }
              : { defaultValue: page?.lead ?? "" })}
            className={input}
          />
        </label>
      </section>

      <section className={card}>
        <h2 className="font-serif text-xl text-fg">Wo liegt die Seite?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Ordner
            <select
              name="folder_id"
              value={parent ? "" : folder}
              disabled={Boolean(parent)}
              onChange={(e) => setFolder(e.target.value)}
              className={`${input} disabled:opacity-60`}
            >
              <option value="">Kein Ordner</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            {parent && <span className="text-xs text-muted">Unterseiten liegen im Ordner ihrer Oberseite.</span>}
          </label>
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Oberseite
            <select name="parent_page_id" value={parent} onChange={(e) => setParent(e.target.value)} className={input}>
              <option value="">Keine, eigene Seite</option>
              {parentChoices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {parentTitle && <span className="text-xs text-muted">Wird Unterseite von „{parentTitle.split(" › ").pop()}“.</span>}
          </label>
        </div>
      </section>

      <section className={card}>
        <div>
          <h2 className="font-serif text-xl text-fg">Steckbrief</h2>
          <p className="text-sm text-muted">Die wichtigsten Fakten als Tabelle neben dem Text. Felder ohne Titel oder Inhalt werden nicht gespeichert.</p>
        </div>
        {fieldRows.length === 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Vorlage für den Steckbrief">
            <span className="text-sm text-muted">Vorlage:</span>
            {WIKI_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t.fields)}
                className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-fg-soft transition hover:border-accent hover:text-accent"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <ProfileFieldsEditor key={fieldsKey} initial={fieldRows} />
      </section>

      <section className={card}>
        <h2 className="font-serif text-xl text-fg">Text</h2>
        <p className="text-sm text-muted">
          Mit <code className="rounded bg-surface-2 px-1">[[Titel]]</code> verlinkst du andere Seiten. Gibt es die Seite noch nicht, wird der Link
          rot und lässt sich mit einem Klick anlegen. Mit <code className="rounded bg-surface-2 px-1">[[Titel|Text]]</code> bestimmst du den
          angezeigten Text.
        </p>
        {(restored || !isNew) && (
          <RichTextEditor
            name="content"
            initialContent={isNew ? draft.content : page?.content}
            onChange={isNew ? (html) => update({ content: html }) : undefined}
            placeholder="Beschreibung, Hintergrund, Regeln …"
            allowFontSelection
            wikiPages={linkTargets}
          />
        )}
      </section>

      <section className={card}>
        <h2 className="font-serif text-xl text-fg">Bilder</h2>
        <div className="flex flex-col gap-1 text-sm text-fg-soft">
          Titelbild
          <AvatarUpload
            name="cover_image_url"
            initialUrl={page?.cover_image_url}
            displayName={page?.title ?? "Wiki-Seite"}
            bucket="wiki-covers"
            variant="cover"
          />
        </div>
        <div className="flex flex-col gap-1 text-sm text-fg-soft">
          Galerie
          <GalleryUpload initial={page?.gallery ?? []} />
          <span className="text-xs text-muted">Weitere Bilder erscheinen unter dem Text. Bilder mitten im Text fügst du mit dem Bild-Knopf im Editor ein.</span>
        </div>
      </section>

      <label className={`${card} gap-1 text-sm text-fg-soft`}>
        Alternative Namen (optional)
        <input
          type="text"
          name="aliases"
          {...(isNew
            ? { value: draft.aliases, onChange: (e: React.ChangeEvent<HTMLInputElement>) => update({ aliases: e.target.value }) }
            : { defaultValue: page?.aliases?.join(", ") })}
          placeholder="z. B. Kapelle, alte Kapelle"
          className={input}
        />
        <span className="text-xs text-muted">
          Kommen diese Wörter in Beiträgen oder Szenen vor, werden sie automatisch mit dieser Seite verlinkt (mit Kommas trennen).
        </span>
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex items-center gap-3 border-t border-line bg-app/90 px-4 py-3 backdrop-blur lg:bottom-0 lg:mx-0 lg:rounded-xl lg:border lg:px-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Speichere …" : page ? "Speichern" : "Seite erstellen"}
        </button>
        <Link href={page ? `/wiki/${page.id}` : "/wiki"} className="text-sm text-muted hover:text-fg">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
