"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { daysInMonth, dateLabelSuggestions, monthName, type EventDate, type PageDates, type WikiCalendar } from "@/lib/wiki-calendar";

const input = "rounded-lg border border-line bg-app px-3 py-2 text-fg outline-none focus:border-accent";

// Kalenderblatt zum Auswählen eines Tages im Kalender der Welt (eigene Monate und Tage, ohne Wochentage).
function CalendarPicker({
  calendar,
  year,
  month,
  day,
  onPick,
}: {
  calendar: WikiCalendar;
  year: string;
  month: string;
  day: string;
  onPick: (y: number, m: number, d: number) => void;
}) {
  const n = calendar.months.length;
  const startYear = Number.parseInt(year, 10);
  const startMonth = Number.parseInt(month, 10);
  const [viewYear, setViewYear] = useState(Number.isInteger(startYear) ? startYear : 1);
  const [viewMonth, setViewMonth] = useState(Number.isInteger(startMonth) && startMonth >= 1 && startMonth <= n ? startMonth : 1);
  const days = daysInMonth(calendar, viewMonth);
  const selected = Number.parseInt(year, 10) === viewYear && Number.parseInt(month, 10) === viewMonth ? Number.parseInt(day, 10) : null;

  function move(delta: number) {
    const m = viewMonth + delta;
    if (m < 1) {
      setViewYear((y) => y - 1);
      setViewMonth(n);
    } else if (m > n) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else setViewMonth(m);
  }

  const nav = "flex h-9 w-9 items-center justify-center rounded-lg border border-line text-fg-soft transition hover:bg-surface-2 hover:text-fg";
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:col-span-3" role="group" aria-label="Kalender">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => move(-1)} aria-label="Voriger Monat" className={nav}>
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg text-fg" aria-live="polite">
            {monthName(calendar, viewMonth)}
          </span>
          <input
            type="number"
            value={viewYear}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10);
              if (Number.isInteger(v)) setViewYear(v);
            }}
            aria-label="Jahr"
            className="w-24 rounded-lg border border-line bg-app px-2 py-1 text-center text-sm text-fg outline-none focus:border-accent"
          />
          {calendar.era && <span className="text-sm text-muted">{calendar.era}</span>}
        </div>
        <button type="button" onClick={() => move(1)} aria-label="Nächster Monat" className={nav}>
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onPick(viewYear, viewMonth, d)}
            aria-pressed={selected === d}
            className={`flex h-10 items-center justify-center rounded-lg text-sm transition ${selected === d ? "bg-accent-strong font-medium text-on-accent-strong" : "text-fg hover:bg-surface-2"}`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const [year, setYear] = useState(initial?.year != null ? String(initial.year) : "");
  const [month, setMonth] = useState(initial?.month ? String(initial.month) : "");
  const [day, setDay] = useState(initial?.day ? String(initial.day) : "");
  const [open, setOpen] = useState(false);
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
        <input type="number" name={`${prefix}_year`} value={year} onChange={(e) => setYear(e.target.value)} placeholder="z. B. 1432" className={input} />
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
          value={day}
          onChange={(e) => setDay(e.target.value)}
          placeholder={month ? `1 bis ${daysInMonth(calendar, Number(month))}` : "erst Monat"}
          className={`${input} disabled:opacity-60`}
        />
      </label>
      <div className="sm:col-span-3">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex items-center gap-1.5 text-sm text-accent hover:underline">
          <CalendarDays className="h-4 w-4" strokeWidth={2} />
          {open ? "Kalender schließen" : "Im Kalender wählen"}
        </button>
      </div>
      {open && (
        <CalendarPicker
          calendar={calendar}
          year={year}
          month={month}
          day={day}
          onPick={(y, m, d) => {
            setYear(String(y));
            setMonth(String(m));
            setDay(String(d));
            setOpen(false);
          }}
        />
      )}
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
