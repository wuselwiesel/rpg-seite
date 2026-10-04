"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Pencil } from "lucide-react";
import { EventDateRange } from "./event-date-fields";
import { formatRange, type PageDates, type WikiCalendar } from "@/lib/wiki-calendar";
import { setSceneDates } from "@/app/story/actions";

// Datum einer Szene in der Story-Übersicht setzen oder ändern, ohne die Szene zu öffnen (nur für die Autor:in).
export function SceneDateToggle({ storyPostId, dates, calendar }: { storyPostId: string; dates: PageDates; calendar: WikiCalendar }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const label = formatRange(calendar, dates);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const err = await setSceneDates(storyPostId, form);
      if (err) setError(err);
      else setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-fg"
      >
        {label ? <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> : <CalendarClock className="h-3.5 w-3.5" strokeWidth={2} />}
        {label ? `Datum: ${label}` : "Datum setzen"}
      </button>
    );
  }

  return (
    <form onSubmit={save} className="mt-1 flex w-full flex-col gap-3 rounded-xl border border-line bg-surface p-3">
      <EventDateRange calendar={calendar} dates={dates} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong disabled:opacity-50">
          Speichern
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted hover:text-fg">
          Abbrechen
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
