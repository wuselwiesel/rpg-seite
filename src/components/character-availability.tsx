"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { alertDialog } from "@/components/confirm-dialog";
import { setCharacterAvailability } from "@/app/characters/availability-actions";
import { AVAILABILITY_LABEL, type Availability } from "@/lib/availability";

const DOT: Record<Availability, string> = { free: "bg-green-500", busy: "bg-red-500" };

// Anzeige: Punkt mit „Frei“ bzw. „Beschäftigt“ und der Ort; ohne beides nichts
export function AvailabilityBadge({ availability, location, className = "" }: { availability: Availability | null; location: string | null; className?: string }) {
  if (!availability && !location) return null;
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center gap-2 text-sm text-fg-soft ${className}`}>
      {availability && (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg">
          <span aria-hidden className={`h-2 w-2 rounded-full ${DOT[availability]}`} />
          {AVAILABILITY_LABEL[availability]}
        </span>
      )}
      {location && (
        <span className="inline-flex min-w-0 items-center gap-1 text-xs">
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="truncate">{location}</span>
        </span>
      )}
    </span>
  );
}

const seg = "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition";

// Für die Besitzer:in: Chip antippen, Frei/Beschäftigt wählen und den Ort eintragen
export function AvailabilityControl({ characterId, availability, location }: { characterId: string; availability: Availability | null; location: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Availability | null>(availability);
  const [place, setPlace] = useState(location ?? "");
  const [pending, startTransition] = useTransition();

  function save(nextValue: Availability | null, nextPlace: string, close = false) {
    startTransition(async () => {
      const error = await setCharacterAvailability(characterId, nextValue, nextPlace);
      if (error) {
        void alertDialog(error);
        return;
      }
      if (close) setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-fit max-w-full items-center rounded-full border border-dashed border-line px-3 py-1 text-left transition hover:border-accent">
        {availability || location ? <AvailabilityBadge availability={availability} location={location} /> : <span className="text-sm text-muted">Status setzen</span>}
      </button>
      {open && (
        <div className="flex max-w-sm flex-col gap-2 rounded-2xl border border-line bg-surface p-3">
          <div role="group" aria-label="Verfügbarkeit" className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {(["free", "busy"] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={value === a}
                disabled={pending}
                onClick={() => {
                  const next = value === a ? null : a;
                  setValue(next);
                  save(next, place);
                }}
                className={`${seg} flex items-center justify-center gap-1.5 ${value === a ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}
              >
                <span aria-hidden className={`h-2 w-2 rounded-full ${DOT[a]}`} />
                {AVAILABILITY_LABEL[a]}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save(value, place, true);
              }
            }}
            maxLength={60}
            placeholder="Wo bist du gerade?"
            aria-label="Aufenthaltsort"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={() => save(value, place, true)} className="rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
              Speichern
            </button>
            {(availability || location) && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setValue(null);
                  setPlace("");
                  save(null, "", true);
                }}
                className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50"
              >
                Löschen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
