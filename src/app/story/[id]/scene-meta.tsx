"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Clock, MapPin, Pencil } from "lucide-react";
import { EventDateRange } from "@/components/event-date-fields";
import { formatRange, type PageDates, type WikiCalendar } from "@/lib/wiki-calendar";
import { updateStoryMeta } from "../actions";

// Ort und Zeitpunkt (in der Spielwelt) einer Szene; die Autor:in kann beides nachträglich ändern.
export function SceneMeta({
  storyPostId,
  location,
  inWorldTime,
  dates,
  calendar,
  canEdit,
}: {
  storyPostId: string;
  location: string | null;
  inWorldTime: string | null;
  dates: PageDates;
  calendar: WikiCalendar;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [loc, setLoc] = useState(location ?? "");
  const [time, setTime] = useState(inWorldTime ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const dateForm = new FormData(e.currentTarget);
    startTransition(async () => {
      const err = await updateStoryMeta(storyPostId, loc, time, dateForm);
      if (err) setError(err);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <form onSubmit={save} className="mb-3 flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            maxLength={80}
            placeholder="Ort"
            className="w-40 rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
          />
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            maxLength={80}
            placeholder="Zusatz, z. B. Abenddämmerung"
            className="w-56 rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-3">
          <EventDateRange calendar={calendar} dates={dates} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong disabled:opacity-50"
          >
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

  const dateLabel = formatRange(calendar, dates);
  if (!location && !inWorldTime && !dateLabel && !canEdit) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-fg-soft">
      {location && (
        <Link
          href={`/story?ort=${encodeURIComponent(location)}`}
          className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 transition hover:text-accent"
        >
          <MapPin className="h-3 w-3" strokeWidth={2} />
          {location}
        </Link>
      )}
      {(dateLabel || inWorldTime) && (
        <Link
          href={dates.start ? `/wiki/kalender?jahr=${dates.start.year}&monat=${dates.start.month ?? 1}` : "/wiki/zeitleiste"}
          className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 transition hover:text-accent"
        >
          <Clock className="h-3 w-3" strokeWidth={2} />
          {[dateLabel, inWorldTime].filter(Boolean).join(", ")}
        </Link>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <Pencil className="h-3 w-3" strokeWidth={2} />
          {location || inWorldTime || dateLabel ? "Ändern" : "Ort und Zeit ergänzen"}
        </button>
      )}
    </div>
  );
}
