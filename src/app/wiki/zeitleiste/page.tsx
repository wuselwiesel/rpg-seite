import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock, Feather, FileText, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiPageRows, getWikiTypes } from "@/lib/wiki-data";
import { getWikiCalendar } from "@/lib/wiki-calendar-data";
import { datesFromRow, formatRange, type Dated, type WikiCalendar } from "@/lib/wiki-calendar";
import { timelineSections } from "@/lib/timeline";
import { hasTag, tagCounts } from "@/lib/wiki-tags";
import { recapToHtml } from "@/lib/recap-html";
import { stripHtml } from "@/lib/strip-html";
import { WikiTypeBadge, WikiTypeIcon } from "@/components/wiki-type-icon";
import { WikiTile } from "@/components/wiki-tile";
import { CharacterAvatar } from "@/components/character-avatar";
import { WikiCrumbs } from "../wiki-crumbs";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const field = "rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent";

type Source = "" | "welt" | "szenen";

type SceneRow = {
  id: string;
  title: string;
  content: string;
  recap: string | null;
  location: string | null;
  in_world_time: string | null;
  tags: string[] | null;
  narrator: boolean | null;
  event_year: number | null;
  event_month: number | null;
  event_day: number | null;
  event_end_year: number | null;
  event_end_month: number | null;
  event_end_day: number | null;
  characters: { name: string; avatar_url: string | null } | null;
  story_arcs: { name: string } | null;
};

type Entry =
  | { kind: "wiki"; id: string; title: string; lead: string | null; type: string | null; draft: boolean; icon: string | null; cover: string | null }
  | { kind: "scene"; id: string; title: string; excerpt: string; location: string | null; extra: string | null; author: string; avatar: string | null; arc: string | null };

const excerpt = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).trimEnd()} …` : s);

function WikiEntryCard({ e, label }: { e: Extract<Entry, { kind: "wiki" }>; label: string }) {
  const hasImage = Boolean(e.icon || e.cover);
  return (
    <Link href={`/wiki/${e.id}`} className="flex gap-3 rounded-2xl border border-line bg-surface p-3.5 transition hover:border-accent/50 hover:bg-surface-2/50 @xl:gap-4 @xl:p-4">
      {hasImage ? (
        <WikiTile id={e.id} title={e.title} cover={e.cover} icon={e.icon} size="md" />
      ) : (
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent @xl:h-14 @xl:w-14">
          {e.type ? <WikiTypeIcon type={e.type} className="h-6 w-6" /> : <FileText className="h-6 w-6" strokeWidth={1.75} />}
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-accent">{label}</span>
          <WikiTypeBadge type={e.type} />
          {e.draft && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">Entwurf</span>}
        </span>
        <span className="font-serif text-xl leading-snug text-fg @xl:text-2xl">{e.title}</span>
        {e.lead && <span className="line-clamp-2 text-sm text-fg-soft">{e.lead}</span>}
      </span>
    </Link>
  );
}

function SceneEntryCard({ e, label }: { e: Extract<Entry, { kind: "scene" }>; label: string }) {
  return (
    <Link
      href={`/story/${e.id}`}
      className="flex flex-col gap-1.5 rounded-2xl border border-line border-l-[3px] border-l-accent bg-surface p-3.5 transition hover:border-accent/50 hover:border-l-accent hover:bg-surface-2/50 @xl:p-4"
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-accent">{label}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-strong/15 px-2.5 py-0.5 text-xs font-medium text-accent">
          <Feather className="h-3.5 w-3.5" strokeWidth={2} />
          Szene
        </span>
        {e.arc && <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-soft">{e.arc}</span>}
      </span>
      <span className="font-serif text-xl leading-snug text-fg @xl:text-2xl">{e.title}</span>
      {e.excerpt && <span className="line-clamp-3 text-sm text-fg-soft">{e.excerpt}</span>}
      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CharacterAvatar name={e.author} avatarUrl={e.avatar} size={20} />
          {e.author}
        </span>
        {e.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" strokeWidth={2} />
            {e.location}
          </span>
        )}
        {e.extra && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" strokeWidth={2} />
            {e.extra}
          </span>
        )}
      </span>
    </Link>
  );
}

function sourceHref(source: Source, type: string, tag: string) {
  const q = new URLSearchParams();
  if (source) q.set("quelle", source);
  if (type) q.set("type", type);
  if (tag) q.set("tag", tag);
  const s = q.toString();
  return `/wiki/zeitleiste${s ? `?${s}` : ""}`;
}

export default async function WikiTimelinePage({ searchParams }: PageProps<"/wiki/zeitleiste">) {
  const sp = await searchParams;
  const type = first(sp.type).slice(0, 40);
  const tag = first(sp.tag).slice(0, 40);
  const q = first(sp.quelle);
  const source: Source = q === "welt" || q === "szenen" ? q : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [rows, calendar, types, { data: sceneData }, { count: undatedScenes }] = await Promise.all([
    getWikiPageRows(world.id),
    getWikiCalendar(world.id),
    getWikiTypes(world.id),
    supabase
      .from("story_posts")
      .select(
        "id, title, content, recap, location, in_world_time, tags, narrator, event_year, event_month, event_day, event_end_year, event_end_month, event_end_day, characters!story_posts_character_id_fkey(name, avatar_url), story_arcs(name)",
      )
      .eq("world_id", world.id)
      .eq("archived", false)
      .not("event_year", "is", null)
      .returns<SceneRow[]>(),
    supabase.from("story_posts").select("id", { count: "exact", head: true }).eq("world_id", world.id).eq("archived", false).is("event_year", null),
  ]);

  const wikiDated = rows.map((r) => ({ ...r, dates: datesFromRow(r) })).filter((r) => r.dates.start);
  const undatedWiki = rows.length - wikiDated.length;
  const scenesDated = (sceneData ?? []).map((s) => ({ ...s, dates: datesFromRow(s) }));

  const wikiShown = source === "szenen" ? [] : wikiDated.filter((r) => (!type || r.page_type === type) && (!tag || hasTag(r, tag)));
  const scenesShown = source === "welt" || type ? [] : scenesDated.filter((s) => !tag || hasTag(s, tag));

  const items: Dated<Entry>[] = [
    ...wikiShown.map(
      (r): Dated<Entry> => ({
        kind: "wiki",
        id: r.id,
        title: r.title,
        lead: r.lead ?? null,
        type: r.page_type ?? null,
        draft: Boolean(r.is_draft),
        icon: r.icon_url ?? null,
        cover: r.cover_image_url ?? null,
        dates: r.dates,
      }),
    ),
    ...scenesShown.map(
      (s): Dated<Entry> => ({
        kind: "scene",
        id: s.id,
        title: s.title,
        excerpt: excerpt(stripHtml(recapToHtml(s.recap)) || stripHtml(s.content), 220),
        location: s.location,
        extra: s.in_world_time,
        author: s.narrator ? "Erzähler:in" : (s.characters?.name ?? "Unbekannt"),
        avatar: s.narrator ? null : (s.characters?.avatar_url ?? null),
        arc: s.story_arcs?.name ?? null,
        dates: s.dates,
      }),
    ),
  ];
  const sections = timelineSections(items);
  const tags = tagCounts([...wikiDated, ...scenesDated]);
  const filtered = Boolean(source || type || tag);
  const era = calendar.era.trim();

  const counts = [
    wikiShown.length > 0 ? `${wikiShown.length} ${wikiShown.length === 1 ? "Seite" : "Seiten"}` : null,
    scenesShown.length > 0 ? `${scenesShown.length} ${scenesShown.length === 1 ? "Szene" : "Szenen"}` : null,
  ].filter(Boolean);
  const missing = [
    source !== "szenen" && undatedWiki > 0 ? `${undatedWiki} ${undatedWiki === 1 ? "Seite hat" : "Seiten haben"} keinen Zeitpunkt` : null,
    source !== "welt" && (undatedScenes ?? 0) > 0 ? `${undatedScenes} ${undatedScenes === 1 ? "Szene hat" : "Szenen haben"} noch kein Datum` : null,
  ].filter(Boolean);

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition ${active ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <WikiCrumbs crumbs={[]} />
        <h1 className="flex items-center gap-3 font-serif text-4xl text-fg @xl:text-5xl">
          <Clock className="h-8 w-8 text-accent" strokeWidth={1.5} />
          Zeitleiste
        </h1>
        <p className="max-w-prose text-fg-soft">
          Die Geschichte der Welt und die Szenen der Story auf einer Achse, von früh nach spät. Das Datum trägst du bei einer Wiki-Seite im Abschnitt „Zeitpunkt“ ein, bei einer
          Szene unter „Ort und Zeit“.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link href="/wiki/kalender" className="flex items-center gap-1.5 text-accent hover:underline">
            <CalendarDays className="h-4 w-4" strokeWidth={2} />
            Zum Kalender
          </Link>
          {counts.length > 0 && <span className="text-muted">{counts.join(", ")}</span>}
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <nav aria-label="Was die Zeitleiste zeigt" className="flex flex-wrap gap-2">
          <Link href={sourceHref("", type, tag)} className={chip(source === "")} aria-current={source === "" ? "true" : undefined}>
            Alles
          </Link>
          <Link href={sourceHref("welt", type, tag)} className={chip(source === "welt")} aria-current={source === "welt" ? "true" : undefined}>
            Weltgeschichte
          </Link>
          <Link href={sourceHref("szenen", "", tag)} className={chip(source === "szenen")} aria-current={source === "szenen" ? "true" : undefined}>
            Story-Szenen
          </Link>
        </nav>
        <details open={Boolean(type || tag)} className="rounded-2xl border border-line bg-surface px-4 py-3">
          <summary className="cursor-pointer text-sm text-fg-soft">Nach Art oder Tag filtern</summary>
        <form method="get" action="/wiki/zeitleiste" className="mt-3 flex flex-wrap items-end gap-3">
          {source && <input type="hidden" name="quelle" value={source} />}
          {source !== "szenen" && (
            <label className="flex flex-col gap-1 text-xs text-muted">
              Art der Seite
              <select name="type" defaultValue={type} className={field}>
                <option value="">Alle</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          )}
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
          {filtered && (
            <Link href="/wiki/zeitleiste" className="py-2 text-sm text-muted hover:text-fg">
              Zurücksetzen
            </Link>
          )}
        </form>
        </details>
        {type && source !== "szenen" && <p className="text-xs text-muted">Mit einer Art der Seite werden Szenen ausgeblendet.</p>}
      </div>

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center text-fg-soft">
          {filtered
            ? "Nichts passt zu diesem Filter."
            : "Noch hat nichts ein Datum. Trage bei einer Wiki-Seite oder einer Szene ein Jahr ein, dann erscheint sie hier."}
        </div>
      ) : (
        <>
          {(sections.length > 1 || sections[0].years.length > 1) && (
            <nav aria-label="Zu einem Abschnitt springen" className="flex flex-wrap gap-1.5">
              {(sections.length > 1 ? sections.map((s) => ({ id: `abschnitt-${s.key}`, label: s.label ?? "" })) : sections[0].years.map((y) => ({ id: `jahr-${y.year}`, label: String(y.year) }))).map((a) => (
                <a key={a.id} href={`#${a.id}`} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-fg-soft transition hover:text-accent">
                  {a.label}
                </a>
              ))}
            </nav>
          )}

          <div aria-label="Zeitleiste" className="flex flex-col">
            {sections.map((section) => (
              <section key={section.key} id={`abschnitt-${section.key}`} className="scroll-mt-6">
                {section.label && (
                  <h2 className="mb-4 mt-6 flex items-center gap-4 font-serif text-2xl text-muted first:mt-0">
                    <span>
                      {section.label}
                      {era && <span className="ml-2 text-base">{era}</span>}
                    </span>
                    <span aria-hidden className="h-px flex-1 bg-line" />
                  </h2>
                )}
                <ol className="flex flex-col">
                  {section.years.map((y) => (
                    <li key={y.year} id={`jahr-${y.year}`} className="flex scroll-mt-6 gap-3 @xl:gap-5 [&:last-child>ul]:pb-0">
                      <div className="w-14 shrink-0 pt-3.5 text-right @xl:w-24">
                        <div className="sticky top-4">
                          <span className="font-serif text-xl leading-none text-fg @xl:text-3xl">{y.year}</span>
                          {era && <span className="mt-1 block text-xs text-muted">{era}</span>}
                        </div>
                      </div>
                      <div aria-hidden className="relative w-3 shrink-0">
                        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line" />
                        <span className="absolute left-1/2 top-[1.15rem] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-app bg-accent @xl:top-5" />
                      </div>
                      <ul className="flex min-w-0 flex-1 flex-col gap-3 pb-8">
                        {y.items.map((p) => (
                          <li key={`${p.kind}-${p.id}`}>
                            {p.kind === "wiki" ? (
                              <WikiEntryCard e={p} label={labelOf(calendar, p.dates)} />
                            ) : (
                              <SceneEntryCard e={p} label={labelOf(calendar, p.dates)} />
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </>
      )}

      {missing.length > 0 && <p className="text-sm text-muted">{missing.join(". ")}.</p>}
    </div>
  );
}

function labelOf(calendar: WikiCalendar, dates: Dated<Entry>["dates"]) {
  return formatRange({ ...calendar, era: "" }, dates);
}
