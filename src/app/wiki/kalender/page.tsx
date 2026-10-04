import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, Feather } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiPageRows } from "@/lib/wiki-data";
import { getWikiCalendar } from "@/lib/wiki-calendar-data";
import { datesFromRow, formatLabeled, monthName, placeInMonth, type Dated } from "@/lib/wiki-calendar";
import { WikiCrumbs } from "../wiki-crumbs";
import { CalendarForm } from "./calendar-form";

type SceneRow = {
  id: string;
  title: string;
  event_year: number | null;
  event_month: number | null;
  event_day: number | null;
  event_end_year: number | null;
  event_end_month: number | null;
  event_end_day: number | null;
};
type Entry = { kind: "wiki" | "scene"; id: string; title: string; labels: { start?: string | null; end?: string | null } };
const hrefOf = (e: Entry) => (e.kind === "scene" ? `/story/${e.id}` : `/wiki/${e.id}`);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const field = "rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent";

export default async function WikiCalendarPage({ searchParams }: PageProps<"/wiki/kalender">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [rows, calendar, { data: sceneRows }] = await Promise.all([
    getWikiPageRows(world.id),
    getWikiCalendar(world.id),
    // Szenen mit Datum stehen im Kalender an ihrem Tag (RLS: nur sichtbare Szenen)
    supabase
      .from("story_posts")
      .select("id, title, event_year, event_month, event_day, event_end_year, event_end_month, event_end_day")
      .eq("world_id", world.id)
      .eq("archived", false)
      .not("event_year", "is", null)
      .returns<SceneRow[]>(),
  ]);
  const dated: Dated<Entry>[] = [
    ...rows.map((r): Dated<Entry> => ({ kind: "wiki", id: r.id, title: r.title, labels: { start: r.event_label, end: r.event_end_label }, dates: datesFromRow(r) })).filter((r) => r.dates.start),
    ...(sceneRows ?? []).map((r): Dated<Entry> => ({ kind: "scene", id: r.id, title: r.title, labels: {}, dates: datesFromRow(r) })),
  ];

  // Startmonat: aus der Adresse, sonst der Monat der frühesten datierten Seite, sonst Jahr 1.
  const earliest = [...dated].sort((a, b) => a.dates.start!.year - b.dates.start!.year)[0]?.dates.start;
  const n = calendar.months.length;
  const yearRaw = Number.parseInt(first(sp.jahr), 10);
  const monthRaw = Number.parseInt(first(sp.monat), 10);
  const year = Number.isInteger(yearRaw) && Math.abs(yearRaw) <= 1_000_000 ? yearRaw : (earliest?.year ?? 1);
  const month = Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= n ? monthRaw : (earliest?.month ?? 1) <= n ? (earliest?.month ?? 1) : 1;

  const prev = month === 1 ? { jahr: year - 1, monat: n } : { jahr: year, monat: month - 1 };
  const next = month === n ? { jahr: year + 1, monat: 1 } : { jahr: year, monat: month + 1 };
  const href = (t: { jahr: number; monat: number }) => `/wiki/kalender?jahr=${t.jahr}&monat=${t.monat}`;

  const days = calendar.months[month - 1].days;
  const { byDay, general } = placeInMonth(dated, year, month, days);
  const era = calendar.era ? ` ${calendar.era}` : "";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <WikiCrumbs crumbs={[]} />
        <h1 className="font-serif text-4xl text-fg @xl:text-5xl">Kalender</h1>
        <Link href="/wiki/zeitleiste" className="flex w-fit items-center gap-1.5 text-sm text-accent hover:underline">
          <Clock className="h-4 w-4" strokeWidth={2} />
          Zur Zeitleiste
        </Link>
      </header>

      <section aria-label="Monatsblatt" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Link href={href(prev)} aria-label="Voriger Monat" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </Link>
            <h2 className="min-w-48 px-3 text-center font-serif text-2xl text-fg" aria-live="polite">
              {monthName(calendar, month)} {year}
              <span className="text-base text-muted">{era}</span>
            </h2>
            <Link href={href(next)} aria-label="Nächster Monat" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
          <form method="get" action="/wiki/kalender" className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Monat
              <select name="monat" defaultValue={month} className={field}>
                {calendar.months.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Jahr
              <input type="number" name="jahr" defaultValue={year} className={`${field} w-28`} />
            </label>
            <button type="submit" className="rounded-lg border border-line px-3 py-2 text-sm text-fg-soft transition hover:border-accent hover:text-accent">
              Anzeigen
            </button>
          </form>
        </div>

        {general.length > 0 && (
          <div className="rounded-2xl border border-dashed border-line p-4">
            <h3 className="mb-2 text-sm font-medium text-muted">Ohne genauen Tag</h3>
            <ul className="flex flex-col gap-1.5">
              {general.map((p) => (
                <li key={p.id}>
                  <Link href={hrefOf(p)} className="flex flex-wrap items-baseline gap-x-2 text-fg hover:text-accent">
                    {p.kind === "scene" && <Feather className="h-3.5 w-3.5 self-center text-accent" strokeWidth={2} aria-label="Szene" />}
                    <span className="font-medium">{p.title}</span>
                    <span className="text-sm text-muted">{formatLabeled(calendar, p.dates, p.labels)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2" aria-label={`Tage im ${monthName(calendar, month)}`}>
          {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
            const list = byDay.get(d) ?? [];
            return (
              <li key={d} data-day={d} className={`flex min-h-20 flex-col gap-1 rounded-xl border p-2 ${list.length ? "border-accent/50 bg-accent/5" : "border-line bg-surface"}`}>
                <span className={`text-xs font-medium ${list.length ? "text-accent" : "text-muted"}`}>{d}</span>
                {list.map((p) => (
                  <Link key={`${p.kind}-${p.id}`} href={hrefOf(p)} className="line-clamp-2 text-sm leading-snug text-fg hover:text-accent">
                    {p.kind === "scene" && <Feather className="mr-1 inline h-3 w-3 -translate-y-px text-accent" strokeWidth={2} aria-label="Szene" />}
                    {p.title}
                  </Link>
                ))}
              </li>
            );
          })}
        </ol>
      </section>

      <CalendarForm calendar={calendar} />
    </div>
  );
}
