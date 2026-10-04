"use client";

import { useState, useTransition } from "react";
import { createTimelineEvent } from "@/app/wiki/actions";
import { EventDateRange } from "@/components/event-date-fields";
import type { EventDate, WikiCalendar } from "@/lib/wiki-calendar";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm";

// Aus einer Nachricht ein Ereignis für die Zeitleiste machen (Wiki-Seite der Art „Ereignis“, mit Verweis auf die Nachricht).
export function MarkEventForm({
  entryId,
  excerpt,
  calendar,
  eventType,
  defaultDate,
  onDone,
}: {
  entryId: string;
  excerpt: string;
  calendar: WikiCalendar;
  eventType: string | null;
  defaultDate: EventDate | null;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const err = await createTimelineEvent(null, fd);
      if (err) setError(err);
      else onDone();
    });
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-3 rounded-lg bg-surface-2 p-3">
      <input type="hidden" name="source_entry_id" value={entryId} />
      {eventType && <input type="hidden" name="page_type" value={eventType} />}
      <input name="title" required maxLength={120} placeholder="Titel des Ereignisses" aria-label="Titel des Ereignisses" autoFocus className={field} />
      <textarea name="lead" rows={2} maxLength={300} defaultValue={excerpt} aria-label="Kurz beschrieben" className={field} />
      <EventDateRange calendar={calendar} dates={{ start: defaultDate, end: null }} />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
          {pending ? "Speichert..." : "Ereignis eintragen"}
        </button>
        <button type="button" onClick={onDone} className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-fg">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
