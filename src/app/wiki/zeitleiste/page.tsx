import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiPageRows } from "@/lib/wiki-data";
import { getWikiCalendar } from "@/lib/wiki-calendar-data";
import { datesFromRow, formatRange, groupByYear } from "@/lib/wiki-calendar";
import { hasTag, tagCounts } from "@/lib/wiki-tags";
import { WIKI_TYPES, wikiTypeOf } from "@/lib/wiki-types";
import { WikiTypeBadge } from "@/components/wiki-type-icon";
import { WikiCrumbs } from "../wiki-crumbs";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const field = "rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent";

export default async function WikiTimelinePage({ searchParams }: PageProps<"/wiki/zeitleiste">) {
  const sp = await searchParams;
  const type = wikiTypeOf(first(sp.type))?.id ?? "";
  const tag = first(sp.tag).slice(0, 40);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [rows, calendar] = await Promise.all([getWikiPageRows(world.id), getWikiCalendar(world.id)]);
  const dated = rows.map((r) => ({ ...r, dates: datesFromRow(r) })).filter((r) => r.dates.start);
  const undated = rows.length - dated.length;
  const shown = dated.filter((r) => (!type || r.page_type === type) && (!tag || hasTag(r, tag)));
  const years = groupByYear(shown);
  const tags = tagCounts(dated);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <WikiCrumbs crumbs={[]} />
        <h1 className="flex items-center gap-3 font-serif text-4xl text-fg @xl:text-5xl">
          <Clock className="h-8 w-8 text-accent" strokeWidth={1.5} />
          Zeitleiste
        </h1>
        <p className="max-w-prose text-fg-soft">
          Alle Seiten mit Zeitpunkt, von früh nach spät. Den Zeitpunkt trägst du beim Bearbeiten einer Seite ein.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/wiki/kalender" className="flex items-center gap-1.5 text-sm text-accent hover:underline">
            <CalendarDays className="h-4 w-4" strokeWidth={2} />
            Zum Kalender
          </Link>
          {undated > 0 && <span className="text-sm text-muted">{undated === 1 ? "1 Seite hat" : `${undated} Seiten haben`} keinen Zeitpunkt.</span>}
        </div>
      </header>

      <form method="get" action="/wiki/zeitleiste" className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Art
          <select name="type" defaultValue={type} className={field}>
            <option value="">Alle</option>
            {WIKI_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tag
          <select name="tag" defaultValue={tag} className={field}>
            <option value="">Alle</option>
            {tags.map((t) => (
              <option key={t.tag} value={t.tag}>
                #{t.tag} ({t.count})
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
          Filtern
        </button>
        {(type || tag) && (
          <Link href="/wiki/zeitleiste" className="py-2 text-sm text-muted hover:text-fg">
            Zurücksetzen
          </Link>
        )}
      </form>

      {years.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center text-fg-soft">
          {dated.length === 0 ? "Noch keine Seite hat einen Zeitpunkt. Trage beim Bearbeiten einer Seite ein Jahr ein." : "Keine Seite passt zu diesem Filter."}
        </div>
      ) : (
        <>
          {years.length > 1 && (
            <nav aria-label="Zu einem Jahr springen" className="flex flex-wrap gap-1.5">
              {years.map((y) => (
                <a key={y.year} href={`#jahr-${y.year}`} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-fg-soft transition hover:text-accent">
                  {y.year}
                </a>
              ))}
            </nav>
          )}
          <ol className="relative flex flex-col gap-8 border-l-2 border-line pl-6 @xl:pl-8" aria-label="Zeitleiste">
            {years.map((y) => (
              <li key={y.year} id={`jahr-${y.year}`} className="relative scroll-mt-6">
                <span aria-hidden className="absolute -left-[calc(1.5rem+7px)] top-2 h-3 w-3 rounded-full border-2 border-surface bg-accent @xl:-left-[calc(2rem+7px)]" />
                <h2 className="mb-3 font-serif text-2xl text-fg">
                  {y.year}
                  {calendar.era && <span className="ml-2 text-base text-muted">{calendar.era}</span>}
                </h2>
                <ul className="flex flex-col gap-2">
                  {y.items.map((p) => (
                    <li key={p.id}>
                      <Link href={`/wiki/${p.id}`} className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface p-3 transition hover:border-accent/50 hover:bg-surface-2/50">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-accent">{formatRange(calendar, p.dates)}</span>
                          <WikiTypeBadge type={p.page_type} />
                          {p.is_draft && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">Entwurf</span>}
                        </span>
                        <span className="font-serif text-xl text-fg">{p.title}</span>
                        {p.lead && <span className="line-clamp-2 text-sm text-fg-soft">{p.lead}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
