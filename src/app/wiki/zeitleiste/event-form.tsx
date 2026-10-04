"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTimelineEvent } from "../actions";
import { EventDateRange } from "@/components/event-date-fields";
import type { WikiCalendar } from "@/lib/wiki-calendar";

const input = "rounded-lg border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent";

// Ereignis direkt in der Zeitleiste eintragen (legt eine Wiki-Seite der Art „Ereignis“ an).
export function TimelineEventForm({ calendar, eventType }: { calendar: WikiCalendar; eventType: string | null }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Eingaben bleiben bei einem Fehler stehen (ein Formular-Action würde die Felder leeren).
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const err = await createTimelineEvent(null, fd);
      if (err) setError(err);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-fit items-center gap-1.5 rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} />
        Ereignis eintragen
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 @xl:p-6">
      {eventType && <input type="hidden" name="page_type" value={eventType} />}
      <div>
        <h2 className="font-serif text-xl text-fg">Neues Ereignis</h2>
      </div>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Titel
        <input name="title" required maxLength={120} placeholder="z. B. Die Schlacht am Nebelpass" className={input} autoFocus />
      </label>
      <label className="flex flex-col gap-1 text-sm text-fg-soft">
        Kurz beschrieben (optional)
        <textarea name="lead" rows={2} maxLength={300} placeholder="Ein bis zwei Sätze" className={input} />
      </label>
      <EventDateRange calendar={calendar} dates={{ start: null, end: null }} labels={{ start: null, end: null }} type={eventType} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
          {pending ? "Speichert …" : "Eintragen"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-fg">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
