// Aufteilung der Zeitleiste in Abschnitte (Jahrhunderte oder Jahrzehnte), damit lange Zeiträume übersichtlich bleiben.
import { groupByYear, type Dated } from "@/lib/wiki-calendar";

export type YearGroup<T> = { year: number; items: Dated<T>[] };
export type TimelineSection<T> = { key: string; label: string | null; years: YearGroup<T>[] };

// 0 = keine Abschnitte (kurzer Zeitraum), sonst Breite eines Abschnitts in Jahren.
export function bucketSize(minYear: number, maxYear: number): number {
  const span = maxYear - minYear;
  if (span >= 250) return 100;
  if (span >= 50) return 10;
  return 0;
}

export function timelineSections<T>(items: Dated<T>[]): TimelineSection<T>[] {
  const years = groupByYear(items);
  if (years.length === 0) return [];
  const size = bucketSize(years[0].year, years[years.length - 1].year);
  if (size === 0) return [{ key: "alle", label: null, years }];
  const out: TimelineSection<T>[] = [];
  for (const y of years) {
    const from = Math.floor(y.year / size) * size;
    const last = out[out.length - 1];
    if (last && last.key === String(from)) last.years.push(y);
    else out.push({ key: String(from), label: `${from} bis ${from + size - 1}`, years: [y] });
  }
  return out;
}
