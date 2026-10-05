import Link from "next/link";
import { redirect } from "next/navigation";
import { BookMarked, ChevronLeft, ChevronRight, Clock, Feather, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiPageRows, getWikiTypes } from "@/lib/wiki-data";
import { getWikiCalendar } from "@/lib/wiki-calendar-data";
import { datesFromRow, formatLabeled, isStandardCalendar, monthName, placeInMonth, sortKey, todayDate, type Dated } from "@/lib/wiki-calendar";
import { getDatedChapters } from "@/lib/chapter-dates";
import { WikiCrumbs } from "../wiki-crumbs";
import { CalendarEventAdd } from "./event-add";
import { CalendarDay } from "./calendar-day";
import { PdfButton } from "@/components/pdf-button";

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
type Entry = { kind: "wiki" | "scene" | "chapter"; id: string; title: string; labels: { start?: string | null; end?: string | null }; href?: string };
const hrefOf = (e: Entry) => e.href ?? (e.kind === "scene" ? `/story/${e.id}` : `/wiki/${e.id}`);

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

  const [rows, calendar, types, { data: sceneRows }, chapters] = await Promise.all([
    getWikiPageRows(world.id),
    getWikiCalendar(world.id),
    getWikiTypes(world.id),
    // Szenen mit Datum stehen im Kalender an ihrem Tag (RLS: nur sichtbare Szenen)
    supabase
      .from("story_posts")
      .select("id, title, event_year, event_month, event_day, event_end_year, event_end_month, event_end_day")
      .eq("world_id", world.id)
      .eq("archived", false)
      .not("event_year", "is", null)
      .returns<SceneRow[]>(),
    getDatedChapters(supabase, world.id),
  ]);
  // Weltereignisse und Szenen sind getrennte Ansichten (?quelle=szenen)
  const source: "welt" | "szenen" = first(sp.quelle) === "szenen" ? "szenen" : "welt";
  const dated: Dated<Entry>[] = source === "szenen" ? [
    ...(sceneRows ?? []).map((r): Dated<Entry> => ({ kind: "scene", id: r.id, title: r.title, labels: {}, dates: datesFromRow(r) })),
    ...chapters.map((c): Dated<Entry> => ({ kind: "chapter", id: c.id, title: c.title, labels: {}, href: `/story/${c.sceneId}#kapitel-${c.number}`, dates: datesFromRow(c) })),
  ] : [
    ...rows.map((r): Dated<Entry> => ({ kind: "wiki", id: r.id, title: r.title, labels: { start: r.event_label, end: r.event_end_label }, href: r.source_story_id ? (r.source_entry_id ? `/story/${r.source_story_id}#beitrag-${r.source_entry_id}` : `/story/${r.source_story_id}`) : undefined, dates: datesFromRow(r) })).filter((r) => r.dates.start),
  ];

  // Startmonat: aus der Adresse, sonst „jetzt“: bei gewöhnlichem Kalender das heutige Datum, sonst der Monat des neuesten datierten Eintrags, sonst Jahr 1.
  const standard = isStandardCalendar(calendar);
  const today = standard ? todayDate() : null;
  const latest = [...dated].sort((a, b) => sortKey(b.dates.start!) - sortKey(a.dates.start!))[0]?.dates.start;
  const startAt = today ?? latest;
  const n = calendar.months.length;
  const yearRaw = Number.parseInt(first(sp.jahr), 10);
  const monthRaw = Number.parseInt(first(sp.monat), 10);
  const year = Number.isInteger(yearRaw) && Math.abs(yearRaw) <= 1_000_000 ? yearRaw : (startAt?.year ?? 1);
  const month = Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= n ? monthRaw : (startAt?.month ?? 1) <= n ? (startAt?.month ?? 1) : 1;

  const prev = month === 1 ? { jahr: year - 1, monat: n } : { jahr: year, monat: month - 1 };
  const next = month === n ? { jahr: year + 1, monat: 1 } : { jahr: year, monat: month + 1 };
  const qs = source === "szenen" ? "&quelle=szenen" : "";
  const href = (t: { jahr: number; monat: number }) => `/wiki/kalender?jahr=${t.jahr}&monat=${t.monat}${qs}`;

  const days = calendar.months[month - 1].days;
  const { byDay, general } = placeInMonth(dated, year, month, days);
  const era = calendar.era ? ` ${calendar.era}` : "";

  // „Ereignis eintragen“: ?neu=<Tag> öffnet das Formular über dem Monatsblatt mit diesem Tag (0 = nur Monat)
  const neuRaw = first(sp.neu);
  const neu = neuRaw === "" ? null : Number.parseInt(neuRaw, 10);
  const neuDay = neu != null && Number.isInteger(neu) && neu >= 1 && neu <= days ? neu : null;
  const adding = source === "welt" && neu != null && Number.isInteger(neu) && neu >= 0 && neu <= days;
  const monthHref = href({ jahr: year, monat: month });
  const addHref = (day: number) => `${monthHref}&neu=${day}`;

  // Alle Einträge dieses Jahres, nach Monat geordnet (Zeiträume zählen mit ihrem Anfang)
  const yearEntries = dated
    .filter((e) => e.dates.start!.year === year)
    .sort((a, b) => (a.dates.start!.month ?? 0) - (b.dates.start!.month ?? 0) || (a.dates.start!.day ?? 0) - (b.dates.start!.day ?? 0) || a.title.localeCompare(b.title, "de"));
  const entriesByMonth = new Map<number, Dated<Entry>[]>();
  for (const e of yearEntries) {
    const m = e.dates.start!.month ?? 0;
    entriesByMonth.set(m, [...(entriesByMonth.get(m) ?? []), e]);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* PDF: der Kalender wird im Querformat gedruckt */}
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>
      <header className="flex flex-col gap-3">
        <div className="print:hidden">
          <WikiCrumbs crumbs={[]} />
        </div>
        <h1 className="font-serif text-4xl text-fg @xl:text-5xl">
          Kalender
          <span className="hidden text-lg text-muted print:inline"> {world.name} · {source === "szenen" ? "Szenen" : "Weltereignisse"}</span>
        </h1>
        <nav aria-label="Was der Kalender zeigt" className="flex flex-wrap gap-2 print:hidden">
          {(["welt", "szenen"] as const).map((s) => (
            <Link
              key={s}
              href={`/wiki/kalender?jahr=${year}&monat=${month}${s === "szenen" ? "&quelle=szenen" : ""}`}
              aria-current={source === s ? "true" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${source === s ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`}
            >
              {s === "welt" ? "Weltereignisse" : "Szenen"}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 print:hidden">
          <PdfButton />
          {source === "welt" && (
            <Link
              href={addHref(0)}
              scroll={false}
              className="flex w-fit items-center gap-1.5 rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              Ereignis eintragen
            </Link>
          )}
          <Link href={source === "szenen" ? "/wiki/zeitleiste?quelle=szenen" : "/wiki/zeitleiste"} className="flex w-fit items-center gap-1.5 text-sm text-accent hover:underline">
            <Clock className="h-4 w-4" strokeWidth={2} />
            Zur Zeitleiste
          </Link>
        </div>
      </header>

      {adding && (
        <div className="print:hidden">
        <CalendarEventAdd
          key={`${year}-${month}-${neu}`}
          calendar={calendar}
          eventType={types.some((t) => t.id === "ereignis") ? "ereignis" : null}
          initial={{ year, month, day: neuDay }}
          closeHref={monthHref}
        />
        </div>
      )}

      <section aria-label="Monatsblatt" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Link href={href(prev)} aria-label="Voriger Monat" className="flex h-9 print:hidden w-9 items-center justify-center rounded-lg border border-line text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </Link>
            <h2 className="min-w-48 px-3 text-center font-serif text-2xl text-fg print:px-0 print:text-left" aria-live="polite">
              {monthName(calendar, month)} {year}
              <span className="text-base text-muted">{era}</span>
            </h2>
            <Link href={href(next)} aria-label="Nächster Monat" className="flex h-9 print:hidden w-9 items-center justify-center rounded-lg border border-line text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
          <form method="get" action="/wiki/kalender" className="flex flex-wrap items-end gap-2 print:hidden">
            {today && (
              <Link href={href({ jahr: today.year, monat: today.month })} className="rounded-lg border border-line px-3 py-2 text-sm text-fg-soft transition hover:border-accent hover:text-accent">
                Heute
              </Link>
            )}
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
                    {p.kind === "chapter" && <BookMarked className="h-3.5 w-3.5 self-center text-accent" strokeWidth={2} aria-label="Kapitel" />}
                    <span className="font-medium">{p.title}</span>
                    <span className="text-sm text-muted">{formatLabeled(calendar, p.dates, p.labels)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2 print:grid-cols-7" aria-label={`Tage im ${monthName(calendar, month)}`}>
          {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
            const list = byDay.get(d) ?? [];
            return (
              <CalendarDay key={d} day={d} addHref={source === "welt" ? addHref(d) : null} className={`flex min-h-20 flex-col gap-1 rounded-xl border p-2 ${list.length ? "border-accent/50 bg-accent/5" : "border-line bg-surface"} ${today && today.year === year && today.month === month && today.day === d ? "ring-2 ring-accent" : ""}`}>
                <span className={`text-xs font-medium ${list.length ? "text-accent" : "text-muted"}`}>{d}</span>
                {list.map((p) => (
                  <Link key={`${p.kind}-${p.id}`} href={hrefOf(p)} className="line-clamp-2 text-sm leading-snug text-fg hover:text-accent">
                    {p.kind === "scene" && <Feather className="mr-1 inline h-3 w-3 -translate-y-px text-accent" strokeWidth={2} aria-label="Szene" />}
                    {p.kind === "chapter" && <BookMarked className="mr-1 inline h-3 w-3 -translate-y-px text-accent" strokeWidth={2} aria-label="Kapitel" />}
                    {p.title}
                  </Link>
                ))}
              </CalendarDay>
            );
          })}
        </ol>
      </section>

      <section aria-label={`Einträge ${year}`} className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl text-fg">
          {year}
          <span className="text-base text-muted">{era}</span>
        </h2>
        {yearEntries.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Einträge in diesem Jahr.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {[...entriesByMonth.entries()].map(([m, list]) => (
              <div key={m}>
                <h3 className="mb-1.5 text-sm font-medium text-muted">
                  {m === 0 ? "Ohne Monat" : (
                    <Link href={href({ jahr: year, monat: m })} className="hover:text-accent">
                      {monthName(calendar, m)}
                    </Link>
                  )}
                </h3>
                <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
                  {list.map((p) => (
                    <li key={`${p.kind}-${p.id}`}>
                      <Link href={hrefOf(p)} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-fg transition hover:bg-surface-2/60 hover:text-accent">
                        <span className="w-28 shrink-0 text-sm text-muted">{formatLabeled(calendar, p.dates, p.labels)}</span>
                        <span className="flex min-w-0 flex-1 items-center gap-1.5 font-medium">
                          {p.kind === "scene" && <Feather className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} aria-label="Szene" />}
                          {p.kind === "chapter" && <BookMarked className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} aria-label="Kapitel" />}
                          <span className="min-w-0 truncate">{p.title}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
