import { describe, expect, it } from "vitest";
import {
  DEFAULT_CALENDAR,
  columnsFromDates,
  datesFromRow,
  eventsInMonth,
  formatDate,
  formatRange,
  groupByYear,
  normalizeCalendar,
  placeInMonth,
  parseCalendarMonths,
  parseEventDate,
  parsePageDates,
  sortKey,
  type Dated,
} from "./wiki-calendar";

const cal = { months: [{ name: "Frostmond", days: 30 }, { name: "Blütenmond", days: 28 }], era: "n. d. Wende" };

describe("Datum formatieren", () => {
  it("nennt Tag, Monat, Jahr und die Jahres-Bezeichnung", () => {
    expect(formatDate(cal, { year: 1432, month: 1, day: 12 })).toBe("12. Frostmond 1432 n. d. Wende");
    expect(formatDate(cal, { year: 1432, month: 2, day: null })).toBe("Blütenmond 1432 n. d. Wende");
    expect(formatDate(DEFAULT_CALENDAR, { year: -50, month: null, day: null })).toBe("-50");
  });
  it("übersteht einen Monat, den es nicht mehr gibt", () => {
    expect(formatDate(cal, { year: 1, month: 9, day: 2 })).toBe("2. Monat 9 1 n. d. Wende");
  });
  it("formatiert Zeiträume, verkürzt im selben Monat", () => {
    expect(formatRange(cal, { start: { year: 1432, month: 1, day: 3 }, end: { year: 1432, month: 1, day: 9 } })).toBe("3. – 9. Frostmond 1432 n. d. Wende");
    expect(formatRange(cal, { start: { year: 1432, month: null, day: null }, end: { year: 1440, month: null, day: null } })).toBe("1432 n. d. Wende – 1440 n. d. Wende");
    expect(formatRange(cal, { start: null, end: null })).toBe("");
    const d = { year: 5, month: 1, day: 1 };
    expect(formatRange(cal, { start: d, end: d })).toBe(formatDate(cal, d));
  });
});

describe("Sortieren", () => {
  it("Jahr vor Monat vor Tag, auch bei negativen Jahren", () => {
    const keys = [
      { year: 10, month: 2, day: 1 },
      { year: 10, month: 1, day: 30 },
      { year: -5, month: 12, day: 30 },
      { year: -4, month: null, day: null },
      { year: 10, month: null, day: null },
    ].sort((a, b) => sortKey(a) - sortKey(b));
    expect(keys.map((k) => `${k.year}/${k.month}/${k.day}`)).toEqual(["-5/12/30", "-4/null/null", "10/null/null", "10/1/30", "10/2/1"]);
  });
});

describe("Eingaben prüfen", () => {
  it("leer = kein Datum; Jahr ist Pflicht, Tag braucht Monat", () => {
    expect(parseEventDate(cal, {})).toBeNull();
    expect(parseEventDate(cal, { month: "1" })).toEqual({ error: "Bitte gib ein Jahr an." });
    expect(parseEventDate(cal, { year: "10", day: "3" })).toEqual({ error: "Für einen Tag brauchst du auch einen Monat." });
  });
  it("Monat und Tag müssen im Kalender vorkommen", () => {
    expect(parseEventDate(cal, { year: "10", month: "3" })).toEqual({ error: "Diesen Monat gibt es im Kalender nicht." });
    expect(parseEventDate(cal, { year: "10", month: "2", day: "29" })).toEqual({ error: "Der Blütenmond hat 28 Tage." });
    expect(parseEventDate(cal, { year: "10", month: "2", day: "28" })).toEqual({ year: 10, month: 2, day: 28 });
    expect(parseEventDate(cal, { year: "abc" })).toEqual({ error: "Das Jahr muss eine ganze Zahl sein." });
  });
  it("Ende nicht vor Anfang und nicht ohne Anfang", () => {
    expect(parsePageDates(cal, { start: { year: "10" }, end: { year: "9" } })).toEqual({ error: "Das Ende liegt vor dem Anfang." });
    expect(parsePageDates(cal, { start: {}, end: { year: "9" } })).toEqual({ error: "Für ein Ende brauchst du auch einen Anfang." });
    expect(parsePageDates(cal, { start: { year: "10" }, end: { year: "20", month: "5" } })).toEqual({ error: "Ende: Diesen Monat gibt es im Kalender nicht." });
    expect(parsePageDates(cal, { start: { year: "10" }, end: { year: "20" } })).toEqual({ start: { year: 10, month: null, day: null }, end: { year: 20, month: null, day: null } });
  });
  it("Spalten und Datum wandeln sich verlustfrei ineinander um", () => {
    const d = { start: { year: 1, month: 2, day: 3 }, end: { year: 4, month: null, day: null } };
    expect(datesFromRow(columnsFromDates(d))).toEqual(d);
    expect(columnsFromDates({ start: null, end: { year: 9, month: 1, day: 1 } }).event_end_year).toBeNull();
    expect(datesFromRow({ event_end_year: 3 })).toEqual({ start: null, end: null });
  });
});

describe("Kalender-Einstellungen", () => {
  it("liest Monate, überspringt leere Zeilen, meldet Fehler", () => {
    expect(parseCalendarMonths([{ name: " Frost ", days: "30" }, { name: "", days: "" }])).toEqual([{ name: "Frost", days: 30 }]);
    expect(parseCalendarMonths([])).toEqual({ error: "Ein Kalender braucht mindestens einen Monat." });
    expect(parseCalendarMonths([{ name: "", days: "5" }])).toEqual({ error: "Jeder Monat braucht einen Namen." });
    expect(parseCalendarMonths([{ name: "X", days: "0" }])).toEqual({ error: "„X“: Die Zahl der Tage muss zwischen 1 und 100 liegen." });
    expect("error" in parseCalendarMonths(Array.from({ length: 41 }, () => ({ name: "M", days: 1 })))).toBe(true);
  });
  it("fällt bei kaputten Daten auf den gewöhnlichen Kalender zurück", () => {
    expect(normalizeCalendar(null).months).toBe(DEFAULT_CALENDAR.months);
    expect(normalizeCalendar([{ name: "A", days: 5 }], " Wende ")).toEqual({ months: [{ name: "A", days: 5 }], era: "Wende" });
  });
});

describe("Zeitleiste und Monatsansicht", () => {
  const mk = (id: string, start: Dated<object>["dates"]["start"], end: Dated<object>["dates"]["end"] = null): Dated<{ id: string }> => ({ id, dates: { start, end } });
  const items = [
    mk("b", { year: 10, month: 2, day: 5 }),
    mk("a", { year: 9, month: null, day: null }),
    mk("c", { year: 10, month: 1, day: 30 }),
    mk("war", { year: 10, month: 1, day: 20 }, { year: 10, month: 3, day: 2 }),
    mk("jahr", { year: 10, month: null, day: null }),
    mk("ohne", null),
  ];
  it("gruppiert nach Jahr in zeitlicher Reihenfolge und lässt Undatierte weg", () => {
    const g = groupByYear(items);
    expect(g.map((x) => x.year)).toEqual([9, 10]);
    expect(g[1].items.map((i) => i.id)).toEqual(["jahr", "war", "c", "b"]);
  });
  it("zeigt im Monat Einträge mit Datum, Zeiträume die ihn berühren und Jahres-Einträge", () => {
    expect(eventsInMonth(items, 10, 2).map((i) => i.id)).toEqual(["jahr", "war", "b"]);
    expect(eventsInMonth(items, 10, 1).map((i) => i.id)).toEqual(["jahr", "war", "c"]);
    expect(eventsInMonth(items, 10, 4).map((i) => i.id)).toEqual(["jahr"]);
    expect(eventsInMonth(items, 11, 1)).toEqual([]);
  });
});

describe("Monatsblatt", () => {
  const mk = (id: string, start: { year: number; month: number | null; day: number | null }, end: { year: number; month: number | null; day: number | null } | null = null) => ({ id, dates: { start, end } });
  const items = [
    mk("tag", { year: 10, month: 2, day: 5 }),
    mk("reise", { year: 10, month: 1, day: 28 }, { year: 10, month: 2, day: 2 }),
    mk("monat", { year: 10, month: 2, day: null }),
    mk("jahr", { year: 10, month: null, day: null }),
    mk("andere", { year: 10, month: 3, day: 1 }),
  ];
  it("setzt Einträge auf ihren Tag und Zeiträume tageweise, Ungefähres kommt nach oben", () => {
    const feb = placeInMonth(items, 10, 2, 28);
    expect(feb.general.map((i) => i.id)).toEqual(["jahr", "monat"]);
    expect([...feb.byDay.keys()]).toEqual([1, 2, 5]);
    expect(feb.byDay.get(1)!.map((i) => i.id)).toEqual(["reise"]);
    expect(feb.byDay.get(5)!.map((i) => i.id)).toEqual(["tag"]);
  });
  it("begrenzt Zeiträume auf die Tage des Monats", () => {
    const jan = placeInMonth(items, 10, 1, 30);
    expect([...jan.byDay.keys()]).toEqual([28, 29, 30]);
    expect(placeInMonth(items, 10, 4, 30).byDay.size).toBe(0);
  });
});
