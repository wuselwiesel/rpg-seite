"use client";

import { useState } from "react";
import { daysInMonth, type EventDate, type PageDates, type WikiCalendar } from "@/lib/wiki-calendar";

const input = "rounded-lg border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent";

// Eingabefelder für ein Datum: Jahr (Pflicht), Monat und Tag (frei). Namen: <prefix>_year, <prefix>_month, <prefix>_day.
export function EventDateFields({ prefix, calendar, initial, label }: { prefix: string; calendar: WikiCalendar; initial: EventDate | null; label: string }) {
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

// Anfang und optional ein Ende. Feldnamen: date_* und date_end_* (gelesen mit parsePageDates).
export function EventDateRange({ calendar, dates }: { calendar: WikiCalendar; dates: PageDates }) {
  const [showEnd, setShowEnd] = useState(Boolean(dates.end));
  return (
    <>
      <EventDateFields prefix="date" calendar={calendar} initial={dates.start} label="Zeitpunkt oder Anfang" />
      {showEnd ? (
        <>
          <EventDateFields prefix="date_end" calendar={calendar} initial={dates.end} label="Ende des Zeitraums" />
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
    </>
  );
}
