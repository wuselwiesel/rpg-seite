"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";
import { SCENE_REVEAL } from "@/lib/reveal-classes";
import { MarkEventForm } from "./mark-event-form";
import { unmarkEvent } from "@/app/wiki/actions";
import type { EventDate, WikiCalendar } from "@/lib/wiki-calendar";

// Flagge am Eröffnungstext der Szene: als Ereignis markieren (Zeitleiste führt zurück zur Szene) bzw. zur Ereignisseite, wenn schon markiert.
export function SceneMarkFlag({
  storyId,
  excerpt,
  calendar,
  eventType,
  defaultDate,
  marked,
}: {
  storyId: string;
  excerpt: string;
  calendar: WikiCalendar;
  eventType: string | null;
  defaultDate: EventDate | null;
  marked: { id: string; title: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <span className="ml-auto flex items-center gap-1">
        {marked ? (
          <>
            <Link href={`/wiki/${marked.id}`} title={`Ereignis: ${marked.title}`} aria-label={`Ereignis: ${marked.title}`} className="rounded p-1 text-accent transition hover:bg-surface-2">
              <Flag className="h-4 w-4 fill-current" strokeWidth={2} />
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => void (await unmarkEvent(marked.id, storyId)))}
              className="rounded px-1.5 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-red-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
            >
              Markierung entfernen
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            title="Als Ereignis markieren"
            aria-label="Als Ereignis markieren"
            aria-pressed={open}
            className={`rounded p-1 text-muted transition hover:bg-surface-2 hover:text-accent ${open ? "" : SCENE_REVEAL}`}
          >
            <Flag className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </span>
      {open && !marked && (
        <div className="basis-full">
          <MarkEventForm storyId={storyId} excerpt={excerpt} calendar={calendar} eventType={eventType} defaultDate={defaultDate} onDone={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
