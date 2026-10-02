// Kalender und Zeitpunkte im Wiki. Jede Welt hat einen eigenen Kalender (Monate mit Namen und Tagen, Jahres-Bezeichnung);
// ohne eigene Einstellung gilt der gewöhnliche. Zeitpunkte dürfen unvollständig sein (nur Jahr; Jahr und Monat) und einen Zeitraum bilden.

export type CalendarMonth = { name: string; days: number };
export type WikiCalendar = { months: CalendarMonth[]; era: string };
export type EventDate = { year: number; month: number | null; day: number | null };
export type PageDates = { start: EventDate | null; end: EventDate | null };

export const DEFAULT_CALENDAR: WikiCalendar = {
  months: [
    ["Januar", 31],
    ["Februar", 28],
    ["März", 31],
    ["April", 30],
    ["Mai", 31],
    ["Juni", 30],
    ["Juli", 31],
    ["August", 31],
    ["September", 30],
    ["Oktober", 31],
    ["November", 30],
    ["Dezember", 31],
  ].map(([name, days]) => ({ name: name as string, days: days as number })),
  era: "",
};

export const MAX_MONTHS = 40;
export const MAX_YEAR = 1_000_000;

// Sortierschlüssel: Jahr vor Monat vor Tag; fehlende Teile zählen als 0 (also „am Anfang“).
export function sortKey(d: EventDate): number {
  return d.year * 100_000 + (d.month ?? 0) * 1000 + (d.day ?? 0);
}

export function monthName(cal: WikiCalendar, month: number): string {
  return cal.months[month - 1]?.name ?? `Monat ${month}`;
}

export function formatDate(cal: WikiCalendar, d: EventDate): string {
  const parts: string[] = [];
  if (d.month != null) parts.push(d.day != null ? `${d.day}. ${monthName(cal, d.month)}` : monthName(cal, d.month));
  parts.push(String(d.year));
  if (cal.era.trim()) parts.push(cal.era.trim());
  return parts.join(" ");
}

// „12. Frostmond 1432“, Zeiträume „1432 – 1440“; gleicher Monat und Jahr verkürzt: „3. – 9. Frostmond 1432“.
export function formatRange(cal: WikiCalendar, dates: PageDates): string {
  const { start, end } = dates;
  if (!start) return "";
  if (!end || sortKey(end) === sortKey(start)) return formatDate(cal, start);
  if (start.year === end.year && start.month != null && start.month === end.month && start.day != null && end.day != null) {
    return `${start.day}. – ${formatDate(cal, end)}`;
  }
  // Die Jahres-Bezeichnung nur einmal am Ende, wenn beide im selben Jahr liegen oder nur Jahre angegeben sind.
  return `${formatDate(cal, start)} – ${formatDate(cal, end)}`;
}

export function daysInMonth(cal: WikiCalendar, month: number): number {
  return cal.months[month - 1]?.days ?? 31;
}

type RawDate = { year?: string | number | null; month?: string | number | null; day?: string | number | null };

const toInt = (v: string | number | null | undefined): number | null => {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).trim());
  return Number.isInteger(n) ? n : NaN;
};

// Prüft eine Eingabe aus dem Formular. Leeres Jahr = kein Datum. Tag braucht einen Monat; Monat und Tag müssen im Kalender vorkommen.
export function parseEventDate(cal: WikiCalendar, raw: RawDate): EventDate | null | { error: string } {
  const year = toInt(raw.year);
  const month = toInt(raw.month);
  const day = toInt(raw.day);
  if (year == null && month == null && day == null) return null;
  if (year == null) return { error: "Bitte gib ein Jahr an." };
  if (Number.isNaN(year) || Math.abs(year) > MAX_YEAR) return { error: "Das Jahr muss eine ganze Zahl sein." };
  if (month != null && (Number.isNaN(month) || month < 1 || month > cal.months.length)) return { error: "Diesen Monat gibt es im Kalender nicht." };
  if (day != null && month == null) return { error: "Für einen Tag brauchst du auch einen Monat." };
  if (day != null && (Number.isNaN(day) || day < 1 || day > daysInMonth(cal, month!))) {
    return { error: `Der ${monthName(cal, month!)} hat ${daysInMonth(cal, month!)} Tage.` };
  }
  return { year, month: month ?? null, day: day ?? null };
}

export type EventColumns = {
  event_year?: number | null;
  event_month?: number | null;
  event_day?: number | null;
  event_end_year?: number | null;
  event_end_month?: number | null;
  event_end_day?: number | null;
};

export function datesFromRow(row: EventColumns): PageDates {
  const start = row.event_year != null ? { year: row.event_year, month: row.event_month ?? null, day: row.event_day ?? null } : null;
  const end = start && row.event_end_year != null ? { year: row.event_end_year, month: row.event_end_month ?? null, day: row.event_end_day ?? null } : null;
  return { start, end };
}

export function columnsFromDates(d: PageDates): Required<EventColumns> {
  return {
    event_year: d.start?.year ?? null,
    event_month: d.start?.month ?? null,
    event_day: d.start?.day ?? null,
    event_end_year: d.start ? (d.end?.year ?? null) : null,
    event_end_month: d.start ? (d.end?.month ?? null) : null,
    event_end_day: d.start ? (d.end?.day ?? null) : null,
  };
}

// Beide Datumsfelder aus dem Formular lesen; das Ende darf nicht vor dem Anfang liegen.
export function parsePageDates(cal: WikiCalendar, raw: { start: RawDate; end: RawDate }): PageDates | { error: string } {
  const start = parseEventDate(cal, raw.start);
  if (start && "error" in start) return { error: start.error };
  const end = parseEventDate(cal, raw.end);
  if (end && "error" in end) return { error: `Ende: ${end.error}` };
  if (end && !start) return { error: "Für ein Ende brauchst du auch einen Anfang." };
  if (start && end && sortKey(end) < sortKey(start)) return { error: "Das Ende liegt vor dem Anfang." };
  return { start, end };
}

// ---- Kalender-Einstellungen ----

export function parseCalendarMonths(raw: { name?: string; days?: string | number }[]): CalendarMonth[] | { error: string } {
  const months: CalendarMonth[] = [];
  for (const m of raw) {
    const name = (m.name ?? "").replace(/\s+/g, " ").trim().slice(0, 30);
    const days = toInt(m.days);
    if (!name && (m.days == null || String(m.days).trim() === "")) continue; // leere Zeile
    if (!name) return { error: "Jeder Monat braucht einen Namen." };
    if (days == null || Number.isNaN(days) || days < 1 || days > 100) return { error: `„${name}“: Die Zahl der Tage muss zwischen 1 und 100 liegen.` };
    months.push({ name, days });
  }
  if (months.length === 0) return { error: "Ein Kalender braucht mindestens einen Monat." };
  if (months.length > MAX_MONTHS) return { error: `Höchstens ${MAX_MONTHS} Monate.` };
  return months;
}

export function normalizeCalendar(raw: unknown, era?: string | null): WikiCalendar {
  const list = Array.isArray(raw) ? raw : [];
  const parsed = parseCalendarMonths(list.map((m) => ({ name: (m as CalendarMonth)?.name, days: (m as CalendarMonth)?.days })));
  return { months: "error" in parsed ? DEFAULT_CALENDAR.months : parsed, era: (era ?? "").trim() };
}

// ---- Zeitleiste und Monatsansicht ----

export type Dated<T> = T & { dates: PageDates };

export function sortByDate<T>(items: Dated<T>[]): Dated<T>[] {
  return items
    .filter((i) => i.dates.start)
    .sort((a, b) => sortKey(a.dates.start!) - sortKey(b.dates.start!));
}

// Gruppen je Jahr in zeitlicher Reihenfolge.
export function groupByYear<T>(items: Dated<T>[]): { year: number; items: Dated<T>[] }[] {
  const out: { year: number; items: Dated<T>[] }[] = [];
  for (const i of sortByDate(items)) {
    const year = i.dates.start!.year;
    const last = out[out.length - 1];
    if (last && last.year === year) last.items.push(i);
    else out.push({ year, items: [i] });
  }
  return out;
}

const lowKey = (d: EventDate) => d.year * 100_000 + (d.month ?? 0) * 1000 + (d.day ?? 0);
const highKey = (d: EventDate) => d.year * 100_000 + (d.month ?? 99) * 1000 + (d.day ?? 999);

// Einträge, die in den gegebenen Monat fallen: Datum im Monat, Zeitraum, der ihn berührt, oder ein Ereignis, das nur ein Jahr nennt.
export function eventsInMonth<T>(items: Dated<T>[], year: number, month: number): Dated<T>[] {
  const monthLow = year * 100_000 + month * 1000;
  const monthHigh = monthLow + 999;
  return sortByDate(items).filter((i) => {
    const low = lowKey(i.dates.start!);
    const high = highKey(i.dates.end ?? i.dates.start!);
    return low <= monthHigh && high >= monthLow;
  });
}

// Platzierung im Monatsblatt: Einträge mit genauem Tag (auch Zeiträume, tageweise) stehen am Tag;
// alles ohne genauen Tag (nur Monat oder Jahr, oder ein Zeitraum ohne Tagesangaben) steht oben als „ohne genauen Tag“.
export function placeInMonth<T>(items: Dated<T>[], year: number, month: number, days: number): { byDay: Map<number, Dated<T>[]>; general: Dated<T>[] } {
  const byDay = new Map<number, Dated<T>[]>();
  const general: Dated<T>[] = [];
  for (const i of eventsInMonth(items, year, month)) {
    const { start, end } = i.dates;
    const exact = start!.day != null && (!end || end.day != null);
    if (!exact) {
      general.push(i);
      continue;
    }
    const monthLow = year * 100_000 + month * 1000;
    const from = Math.max(lowKey(start!), monthLow + 1) - monthLow;
    const to = Math.min(highKey(end ?? start!) - monthLow, days);
    for (let d = from; d <= to; d++) byDay.set(d, [...(byDay.get(d) ?? []), i]);
  }
  return { byDay, general };
}
