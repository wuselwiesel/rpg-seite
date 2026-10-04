"use client";

import { useRouter } from "next/navigation";
import { TimelineEventForm } from "../zeitleiste/event-form";
import type { EventDate, WikiCalendar } from "@/lib/wiki-calendar";

// Ereignis im Kalender eintragen: Das Formular steht über dem Monatsblatt, das Datum ist mit dem angeklickten Tag vorbelegt.
export function CalendarEventAdd({ calendar, eventType, initial, closeHref }: { calendar: WikiCalendar; eventType: string | null; initial: EventDate; closeHref: string }) {
  const router = useRouter();
  return <TimelineEventForm calendar={calendar} eventType={eventType} initial={initial} defaultOpen onClose={() => router.replace(closeHref)} />;
}
