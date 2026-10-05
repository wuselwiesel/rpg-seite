"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startNextScene } from "../actions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { EventDateRange } from "@/components/event-date-fields";
import type { WikiCalendar } from "@/lib/wiki-calendar";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm";

// Neues Kapitel = neue Szene: Titel, Anfangstext, Datum/Zeit, Ort und eine Zusammenfassung der abgeschlossenen Szene.
export function NextSceneForm({
  storyPostId,
  writerId,
  calendar,
  locations,
  location,
  onDone,
}: {
  storyPostId: string;
  writerId: string;
  calendar: WikiCalendar;
  locations: string[];
  location: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await startNextScene(storyPostId, formData);
      if ("error" in result) setError(result.error);
      else router.push(`/story/${result.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg bg-surface-2 p-3">
      <input type="hidden" name="character_id" value={writerId} />
      <input type="text" name="title" required maxLength={100} placeholder="Titel der neuen Szene, z. B. Der Nebel steigt" className={field} />
      <RichTextEditor name="content" placeholder="Erzähl, wie es weitergeht..." allowFontSelection minHeight={90} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="text" name="location" list="next-scene-locations" maxLength={80} defaultValue={location ?? ""} placeholder="Ort (optional)" aria-label="Ort" className={field} />
        <input type="text" name="in_world_time" maxLength={80} placeholder="Zeit, z. B. Abenddämmerung" aria-label="Zeit" className={field} />
        <datalist id="next-scene-locations">
          {locations.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
        <EventDateRange calendar={calendar} dates={{ start: null, end: null }} />
      </div>
      <textarea name="short_summary" maxLength={300} rows={2} placeholder="Kurzbeschreibung für die Zeitleiste (optional)" className={field} />
      <textarea name="recap" maxLength={1500} rows={2} placeholder="Zusammenfassung der abgeschlossenen Szene (optional)" className={field} />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
          {pending ? "Lege an..." : "Neue Szene beginnen"}
        </button>
        <button type="button" onClick={onDone} className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-fg">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
