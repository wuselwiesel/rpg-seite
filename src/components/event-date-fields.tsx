"use client";

import { useState } from "react";
import { daysInMonth, dateLabelSuggestions, type EventDate, type PageDates, type WikiCalendar } from "@/lib/wiki-calendar";

const input = "rounded-lg border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent";

// Eingabefelder für ein Datum: Jahr (Pflicht), Monat und Tag (frei). Namen: <prefix>_year, <prefix>_month, <prefix>_day.
export function EventDateFields({
  prefix,
  calendar,
  initial,
  label,
  textLabel,
}: {
  prefix: string;
  calendar: WikiCalendar;
  initial: EventDate | null;
  label: string;
  // Freie Bezeichnung zum Datum („Geboren“), mit Vorschlägen; ohne Angabe gibt es kein Feld dafür.
  textLabel?: { name: string; value: string | null; suggestions: string[] };
}) {
  const [month, setMonth] = useState(initial?.month ? String(initial.month) : "");
  return (
    <fieldset className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr]">
      <legend className="mb-1 text-sm font-medium text-fg-soft">{label}</legend>
      {textLabel && (
        <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-3">
          Bezeichnung (optional)
          <input
            type="text"
            name={textLabel.name}
            defaultValue={textLabel.value ?? ""}
            maxLength={40}
            list={`${prefix}-vorschlaege`}
            placeholder={`z. B. ${textLabel.suggestions[0] ?? "Geboren"}`}
            className={input}
          />
          <datalist id={`${prefix}-vorschlaege`}>
            {textLabel.suggestions.map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
        </label>
      )}
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
export function EventDateRange({
  calendar,
  dates,
  labels,
  type,
}: {
  calendar: WikiCalendar;
  dates: PageDates;
  // Mit Angabe erscheinen Felder für die Bezeichnungen (date_label, date_end_label); Vorschläge richten sich nach der Art der Seite.
  labels?: { start: string | null; end: string | null };
  type?: string | null;
}) {
  const sug = dateLabelSuggestions(type);
  const [showEnd, setShowEnd] = useState(Boolean(dates.end));
  return (
    <>
      <EventDateFields prefix="date" calendar={calendar} initial={dates.start} label="Zeitpunkt oder Anfang" textLabel={labels ? { name: "date_label", value: labels.start, suggestions: sug.start } : undefined} />
      {showEnd ? (
        <>
          <EventDateFields prefix="date_end" calendar={calendar} initial={dates.end} label="Ende des Zeitraums" textLabel={labels ? { name: "date_end_label", value: labels.end, suggestions: sug.end } : undefined} />
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
