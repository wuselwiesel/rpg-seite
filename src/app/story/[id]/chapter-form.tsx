"use client";

import { useState } from "react";
import { EventDateFields } from "@/components/event-date-fields";
import type { WikiCalendar } from "@/lib/wiki-calendar";

// Formular für ein Kapitel innerhalb einer Szene (neu anlegen oder Kapitel 1 benennen). Nur der Name ist Pflicht.
// `onSubmit` liefert null bei Erfolg, sonst die Fehlermeldung.
export function ChapterForm({
  calendar,
  heading,
  submitLabel,
  onSubmit,
  onCancel,
  titlePlaceholder = "Name des Kapitels",
  labelPlaceholder = "Bezeichnung (statt „Kapitel“), z. B. Teil II",
  initial,
  withDetails = true,
}: {
  calendar: WikiCalendar;
  heading?: string;
  submitLabel: string;
  onSubmit: (formData: FormData) => Promise<string | null>;
  onCancel: () => void;
  titlePlaceholder?: string;
  labelPlaceholder?: string;
  initial?: { title?: string | null; label?: string | null };
  // Datum und „Was bisher geschah“ (bei Kapitel 1 nicht vorhanden)
  withDetails?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setPending(true);
    const err = await onSubmit(formData);
    setPending(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={submit} className="my-3 flex flex-col gap-3 rounded-xl border border-accent/40 bg-surface-2 p-3">
      {heading && <p className="text-sm font-medium text-accent">{heading}</p>}
      <input
        type="text"
        name="title"
        required={withDetails}
        maxLength={100}
        defaultValue={initial?.title ?? ""}
        placeholder={titlePlaceholder}
        aria-label="Name des Kapitels"
        autoFocus
        className="rounded-md border border-line bg-surface px-3 py-2 font-serif text-xl text-fg outline-none focus:border-accent"
      />
      <input
        type="text"
        name="label"
        maxLength={40}
        defaultValue={initial?.label ?? ""}
        placeholder={labelPlaceholder}
        aria-label="Bezeichnung (statt Kapitel)"
        className="rounded-md border border-line bg-surface px-3 py-1.5 text-base text-fg outline-none focus:border-accent sm:text-sm"
      />
      {withDetails && (
        <>
          <EventDateFields prefix="date" calendar={calendar} initial={null} label="Datum im Kalender der Welt (optional)" />
          <textarea
            name="summary"
            maxLength={1500}
            rows={2}
            placeholder="Was ist bisher geschehen? (optional, für den Rückblick)"
            className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
          />
        </>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
          {pending ? "Speichert..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-fg">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
