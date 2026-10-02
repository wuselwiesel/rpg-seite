"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createWikiPage, updateWikiPage } from "./actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { AvatarUpload } from "@/components/avatar-upload";
import { GalleryUpload } from "@/components/gallery-upload";
import { ProfileFieldsEditor } from "@/components/profile-fields-editor";
import { useDraft } from "@/lib/use-draft";
import { WIKI_TYPES, mergeFields, outlineHtml, usesPortraitImage, wikiTypeOf } from "@/lib/wiki-types";
import { WikiTypeIcon } from "@/components/wiki-type-icon";
import { stripHtml } from "@/lib/strip-html";
import { DEFAULT_CALENDAR, daysInMonth, datesFromRow, type EventDate, type WikiCalendar } from "@/lib/wiki-calendar";
import type { ProfileField } from "@/lib/profile-fields";
import type { FolderOption, PageOption } from "@/lib/wiki-tree";
import type { WikiPage } from "@/lib/types";

const input = "rounded-lg border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent";
// Eingabefelder für ein Datum: Jahr (Pflicht), Monat und Tag (frei). Namen: <prefix>_year, <prefix>_month, <prefix>_day.
function DateFields({ prefix, calendar, initial, label }: { prefix: string; calendar: WikiCalendar; initial: EventDate | null; label: string }) {
  const [month, setMonth] = useState(initial?.month ? String(initial.month) : "");
  return (
    <fieldset className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr]">
      <legend className="mb-1 text-sm font-medium text-fg-soft">{label}</legend>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Jahr
        <input type="number" name={`${prefix}_year`} defaultValue={initial?.year ?? ""} placeholder="z. B. 1432" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Monat
        <select name={`${prefix}_month`} value={month} onChange={(e) => setMonth(e.target.value)} className={input}>
          <option value="">Unbekannt</option>
          {calendar.months.map((m, i) => (
            <option key={i} value={i + 1}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Tag
        <input
          type="number"
          name={`${prefix}_day`}
          min={1}
          max={month ? daysInMonth(calendar, Number(month)) : undefined}
          disabled={!month}
          defaultValue={initial?.day ?? ""}
          placeholder={month ? `1 bis ${daysInMonth(calendar, Number(month))}` : "erst Monat"}
          className={`${input} disabled:opacity-60`}
        />
      </label>
    </fieldset>
  );
}

const card = "flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 @xl:p-6";

export function WikiForm({
  page,
  folders,
  parentChoices,
  linkTargets,
  characters = [],
  calendar = DEFAULT_CALENDAR,
  defaults,
  canSetDraft = true,
}: {
  page?: WikiPage;
  folders: FolderOption[];
  parentChoices: PageOption[];
  linkTargets: { id: string; title: string }[];
  characters?: { id: string; name: string; avatar_url: string | null }[];
  calendar?: WikiCalendar;
  defaults?: { title?: string; folder?: string; parent?: string; type?: string };
  // Entwurf nur für die, die die Seite angelegt haben.
  canSetDraft?: boolean;
}) {
  const action = page ? updateWikiPage.bind(null, page.id) : createWikiPage;
  const [error, formAction, pending] = useActionState(action, null);
  const isNew = !page;
  // Neue Einträge: Entwurf im Browser merken (Bearbeiten lädt immer den gespeicherten Stand).
  const { draft, restored, update, clear } = useDraft("draft:wiki-new", {
    title: defaults?.title ?? "",
    lead: "",
    aliases: "",
    tags: "",
    content: "",
  });
  const [parent, setParent] = useState(page?.parent_page_id ?? defaults?.parent ?? "");
  const [folder, setFolder] = useState(page?.folder_id ?? defaults?.folder ?? "");
  const [fieldRows, setFieldRows] = useState<ProfileField[]>(page?.fields ?? []);
  const [fieldsKey, setFieldsKey] = useState(0);
  const dates = datesFromRow(page ?? {});
  const [showEnd, setShowEnd] = useState(Boolean(dates.end));

  const [pageType, setPageType] = useState(wikiTypeOf(page?.page_type ?? defaults?.type)?.id ?? "");
  const [bodyHtml, setBodyHtml] = useState(page?.content ?? "");
  const [editorKey, setEditorKey] = useState(0);
  const [seed, setSeed] = useState<string | null>(null);
  const currentBody = isNew ? draft.content : bodyHtml;

  // Typ wählen: leere Felder und eine leere Gliederung werden vorbereitet. Was schon geschrieben steht, bleibt unberührt.
  function chooseType(id: string) {
    setPageType(id);
    const type = wikiTypeOf(id);
    if (!type) return;
    if (!fieldRows.some((f) => f.title.trim() || f.text.trim())) {
      setFieldRows(mergeFields(fieldRows, type));
      setFieldsKey((k) => k + 1);
    }
    if (stripHtml(currentBody).trim() === "" && !/<img\b/i.test(currentBody)) {
      const html = outlineHtml(type);
      setSeed(html);
      setBodyHtml(html);
      if (isNew) update({ content: html });
      setEditorKey((k) => k + 1);
    }
  }

  const parentTitle = parentChoices.find((p) => p.id === parent)?.label;

  return (
    <form action={formAction} onSubmit={() => isNew && clear()} className="flex flex-col gap-5">
      <input type="hidden" name="page_type" value={pageType} />
      <section className={card}>
        <div>
          <h2 className="font-serif text-xl text-fg">Art der Seite</h2>
          <p className="text-sm text-muted">Der Typ bereitet Steckbrief und Gliederung vor. Beides kannst du frei ändern.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Art der Seite">
          <button
            type="button"
            role="radio"
            aria-checked={pageType === ""}
            onClick={() => setPageType("")}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${pageType === "" ? "border-accent bg-accent/10 text-fg" : "border-line text-fg-soft hover:border-accent hover:text-accent"}`}
          >
            Keine
          </button>
          {WIKI_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={pageType === t.id}
              title={t.hint}
              onClick={() => chooseType(t.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${pageType === t.id ? "border-accent bg-accent/10 text-fg" : "border-line text-fg-soft hover:border-accent hover:text-accent"}`}
            >
              <WikiTypeIcon type={t.id} className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </section>

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
          <h2 className="font-serif text-xl text-fg">Zeitpunkt (optional)</h2>
          <p className="text-sm text-muted">
            Wann spielt das? Das Jahr genügt, Monat und Tag sind freiwillig. Datierte Seiten erscheinen in der Zeitleiste und im Kalender (
            <Link href="/wiki/kalender" className="text-accent underline underline-offset-2">
              Kalender der Welt
            </Link>
            ).
          </p>
        </div>
        <DateFields prefix="date" calendar={calendar} initial={dates.start} label="Zeitpunkt oder Anfang" />
        {showEnd ? (
          <>
            <DateFields prefix="date_end" calendar={calendar} initial={dates.end} label="Ende des Zeitraums" />
            <div>
              <button type="button" onClick={() => setShowEnd(false)} className="text-sm text-muted hover:text-fg">
                Zeitraum entfernen
              </button>
            </div>
          </>
        ) : (
          <div>
            <button type="button" onClick={() => setShowEnd(true)} className="text-sm text-accent hover:underline">
              + Zeitraum (mit Ende)
            </button>
          </div>
        )}
      </section>

      <section className={card}>
        <div>
          <h2 className="font-serif text-xl text-fg">Steckbrief</h2>
          <p className="text-sm text-muted">Die wichtigsten Fakten als Tabelle neben dem Text. Mit [[Seite]] oder [[Figur]] verlinkst du auch hier. Felder ohne Titel oder Inhalt werden nicht gespeichert.</p>
        </div>
        <ProfileFieldsEditor key={fieldsKey} initial={fieldRows} />
      </section>

      <section className={card}>
        <h2 className="font-serif text-xl text-fg">Text</h2>
        <p className="text-sm text-muted">
          Tippe <code className="rounded bg-surface-2 px-1">@</code> und wähle eine Seite oder eine Figur, oder schreibe{" "}
          <code className="rounded bg-surface-2 px-1">[[Titel]]</code>, um Seiten zu verlinken. Gibt es die Seite noch nicht, wird der Link
          rot und lässt sich mit einem Klick anlegen. Mit <code className="rounded bg-surface-2 px-1">[[Titel|Text]]</code> bestimmst du den
          angezeigten Text.
        </p>
        {(restored || !isNew) && (
          <RichTextEditor
            key={editorKey}
            name="content"
            initialContent={seed ?? (isNew ? draft.content : page?.content)}
            onChange={(html) => {
              setBodyHtml(html);
              if (isNew) update({ content: html });
            }}
            placeholder="Beschreibung, Hintergrund, Regeln …"
            allowFontSelection
            allowBlocks
            wikiPages={linkTargets}
            wikiCharacters={characters}
          />
        )}
      </section>

      <section className={card}>
        <h2 className="font-serif text-xl text-fg">Bilder</h2>
        <div className="flex flex-col gap-1 text-sm text-fg-soft">
          {usesPortraitImage(pageType) ? "Bild (Hochformat, wie ein Charakterbild)" : "Titelbild"}
          <AvatarUpload
            name="cover_image_url"
            initialUrl={page?.cover_image_url}
            displayName={page?.title ?? "Wiki-Seite"}
            bucket="wiki-covers"
            variant={usesPortraitImage(pageType) ? "portrait" : "cover"}
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

      <label className={`${card} gap-1 text-sm text-fg-soft`}>
        Tags (optional)
        <input
          type="text"
          name="tags"
          {...(isNew
            ? { value: draft.tags ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => update({ tags: e.target.value }) }
            : { defaultValue: page?.tags?.join(", ") })}
          placeholder="z. B. Magie, Küste, Alte Zeit"
          className={input}
        />
        <span className="text-xs text-muted">Stichwörter, mit Kommas getrennt. Über sie findet man Seiten aus verschiedenen Ordnern zusammen.</span>
      </label>

      {canSetDraft && (
        <label className={`${card} flex-row items-start gap-3 text-sm text-fg-soft`}>
          <input type="checkbox" name="is_draft" defaultChecked={Boolean(page?.is_draft)} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
          <span>
            <span className="font-medium text-fg">Entwurf</span>
            <span className="block text-xs text-muted">Nur du siehst die Seite. Mit „Veröffentlichen“ auf der Seite sehen sie alle in der Welt.</span>
          </span>
        </label>
      )}

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
