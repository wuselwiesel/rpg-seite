import Link from "next/link";
import { CalendarDays, Clock, LayoutTemplate, Map as MapIcon, Network, Search, Shuffle, Users } from "lucide-react";
import { EmojiHtml } from "@/components/custom-emoji-provider";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostHtml } from "@/lib/sanitize";
import { autolinkHtml } from "@/lib/autolink";
import { linkCharacterMentions } from "@/lib/character-links";
import { getWorldCharacterTerms } from "@/lib/wiki-characters";
import { getWikiTerms } from "@/lib/wiki-terms";
import { getWikiMaps } from "@/lib/wiki-map-data";
import { getWikiFavoriteIds, getWikiFolders, getWikiPageRows } from "@/lib/wiki-data";
import { buildWikiTree, findFolder, type PageRow, type TreePage } from "@/lib/wiki-tree";
import { tagCounts } from "@/lib/wiki-tags";
import { formatDate } from "@/lib/format";
import { LIST_SOURCES, visibleBlocks, type HomeBlock, type ListBlock, type WikiHome } from "@/lib/wiki-home";
import type { World } from "@/lib/types";
import { FolderCard, PageCard } from "../wiki-cards";
import { PageLine } from "../wiki-overview";

const sectionTitle = "mb-4 font-serif text-2xl text-fg";
const chip =
  "flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg-soft transition hover:border-accent hover:text-accent";

const SHORTCUTS = [
  { href: "/wiki/karten", label: "Karten", Icon: MapIcon },
  { href: "/wiki/graph", label: "Graph", Icon: Network },
  { href: "/characters/relationships", label: "Beziehungen", Icon: Users },
  { href: "/wiki/zeitleiste", label: "Zeitleiste", Icon: Clock },
  { href: "/wiki/kalender", label: "Kalender", Icon: CalendarDays },
  { href: "/wiki/zufall", label: "Zufällig", Icon: Shuffle },
] as const;

export async function HomeView({ world, userId, home, canEdit }: { world: World; userId: string; home: WikiHome; canEdit: boolean }) {
  const blocks = visibleBlocks(home);
  const need = (t: HomeBlock["type"]) => blocks.some((b) => b.type === t);
  const needsList = need("list");
  const supabase = await createClient();

  const [folders, pageRows, maps, favoriteIds, wikiTerms, characters] = await Promise.all([
    getWikiFolders(world.id),
    getWikiPageRows(world.id),
    need("tiles") ? getWikiMaps(world.id) : Promise.resolve([]),
    needsList ? getWikiFavoriteIds(userId) : Promise.resolve([] as string[]),
    need("text") ? getWikiTerms(world.id) : Promise.resolve([]),
    need("text") ? getWorldCharacterTerms(world.id) : Promise.resolve([]),
  ]);
  const tree = buildWikiTree(folders, pageRows);
  const published = pageRows.filter((p) => !p.is_draft);
  const byId = new Map(pageRows.map((p) => [p.id, p]));
  const treePages = new Map<string, TreePage>();
  const walk = (list: TreePage[]) => {
    for (const p of list) {
      treePages.set(p.id, p);
      walk(p.children);
    }
  };
  walk(tree.loose);
  const walkFolders = (list: typeof tree.folders) => {
    for (const f of list) {
      walk(f.pages);
      walkFolders(f.children);
    }
  };
  walkFolders(tree.folders);

  const sceneBlocks = blocks.filter((b): b is ListBlock => b.type === "list" && b.source === "scenes");
  const sceneLimit = Math.max(0, ...sceneBlocks.map((b) => b.count));
  const { data: sceneRows } =
    sceneLimit > 0
      ? await supabase.from("story_posts").select("id, title, created_at").eq("world_id", world.id).order("created_at", { ascending: false }).limit(sceneLimit).returns<{ id: string; title: string; created_at: string }[]>()
      : { data: [] as { id: string; title: string; created_at: string }[] };

  function listItems(b: ListBlock): React.ReactNode {
    const n = b.count;
    const lines = (rows: PageRow[], note?: (p: PageRow) => string) => (
      <ul className="grid gap-x-6 gap-y-1 @2xl:grid-cols-2">
        {rows.slice(0, n).map((p) => (
          <li key={p.id}>
            <PageLine p={p} folders={folders} note={note?.(p)} />
          </li>
        ))}
      </ul>
    );
    switch (b.source) {
      case "recent":
        return lines([...published].sort((a, c) => (c.updated_at ?? "").localeCompare(a.updated_at ?? "")), (p) => (p.updated_at ? formatDate(p.updated_at.slice(0, 10)) : ""));
      case "newest":
        return lines([...published].sort((a, c) => (c.created_at ?? "").localeCompare(a.created_at ?? "")), (p) => (p.created_at ? formatDate(p.created_at.slice(0, 10)) : ""));
      case "favorites":
        return lines(favoriteIds.map((id) => byId.get(id)).filter((p): p is PageRow => Boolean(p)));
      case "drafts":
        return lines(pageRows.filter((p) => p.is_draft && p.created_by === userId), () => "Entwurf");
      case "scenes":
        return (
          <ul className="flex flex-col gap-1.5">
            {(sceneRows ?? []).slice(0, n).map((sc) => (
              <li key={sc.id}>
                <Link href={`/story/${sc.id}`} className="text-fg-soft transition hover:text-accent">
                  {sc.title}
                  <span className="ml-2 text-xs text-muted">{formatDate(sc.created_at.slice(0, 10))}</span>
                </Link>
              </li>
            ))}
          </ul>
        );
      case "tags":
        return (
          <ul className="flex flex-wrap gap-2">
            {tagCounts(published)
              .slice(0, n * 3)
              .map((t) => (
                <li key={t.tag}>
                  <Link href={`/wiki/suche?tag=${encodeURIComponent(t.tag)}`} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm text-fg-soft transition hover:text-accent">
                    #{t.tag}
                    <span className="text-xs text-muted">{t.count}</span>
                  </Link>
                </li>
              ))}
          </ul>
        );
    }
  }

  function render(b: HomeBlock): React.ReactNode {
    switch (b.type) {
      case "hero": {
        const title = b.title || world.name;
        const ratio = { s: "aspect-[16/5]", m: "aspect-[16/7]", l: "aspect-[16/10]" }[b.size];
        const pad = { s: "p-4 @xl:p-6", m: "p-5 @xl:p-8", l: "p-6 @xl:p-12" }[b.size];
        const center = b.align === "center" ? "text-center [&_p]:mx-auto" : "";
        return (
          <header className={`relative overflow-hidden rounded-2xl border border-line bg-surface-2 ${center}`}>
            {b.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" src={b.image} alt="" className={`${ratio} w-full object-cover`} />
            )}
            <div className={b.image ? `absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent ${pad}` : pad}>
              <h1 className={`font-serif text-4xl leading-tight @xl:text-6xl ${b.image ? "text-white" : "text-fg"}`}>{title}</h1>
              {b.subtitle && <p className={`mt-2 max-w-prose ${b.image ? "text-white/85" : "text-fg-soft"}`}>{b.subtitle}</p>}
            </div>
          </header>
        );
      }
      case "text": {
        const withMentions = linkCharacterMentions(sanitizePostHtml(b.html), new Map(characters.map((c) => [c.id, c])));
        const html = autolinkHtml(withMentions, { wiki: wikiTerms, characters });
        return (
          <section>
            {b.title && <h2 className={sectionTitle}>{b.title}</h2>}
            <EmojiHtml className="post-content wiki-prose min-w-0" html={html} />
          </section>
        );
      }
      case "tiles": {
        const mapById = new Map(maps.map((m) => [m.id, m]));
        const items = b.items.flatMap((t, i) => {
          if (t.kind === "page") {
            const p = treePages.get(t.id);
            return p && !p.is_draft ? [<li key={`p${t.id}`}><PageCard page={p} showChildren={false} /></li>] : [];
          }
          if (t.kind === "folder") {
            const f = findFolder(tree.folders, t.id);
            return f ? [<li key={`f${t.id}`}><FolderCard folder={f} index={i} /></li>] : [];
          }
          const m = mapById.get(t.id);
          return m
            ? [
                <li key={`m${t.id}`}>
                  <Link href={`/wiki/karten/${m.id}`} className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-accent/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.image_url} alt="" loading="lazy" className="aspect-[4/3] w-full bg-surface-2 object-cover" />
                    <span className="p-3 font-serif text-lg text-fg">{m.title}</span>
                  </Link>
                </li>,
              ]
            : [];
        });
        if (items.length === 0) return null;
        return (
          <section>
            {b.title && <h2 className={sectionTitle}>{b.title}</h2>}
            <ul className={`grid gap-3 @xl:grid-cols-2 ${{ 2: "", 3: "@4xl:grid-cols-3", 4: "@4xl:grid-cols-4" }[b.columns]}`}>{items}</ul>
          </section>
        );
      }
      case "list": {
        const content = listItems(b);
        const empty =
          (b.source === "scenes" && (sceneRows ?? []).length === 0) ||
          (b.source === "favorites" && favoriteIds.length === 0) ||
          (b.source === "drafts" && !pageRows.some((p) => p.is_draft && p.created_by === userId)) ||
          (b.source === "tags" && tagCounts(published).length === 0) ||
          (["recent", "newest"].includes(b.source) && published.length === 0);
        if (empty) return null;
        return (
          <section>
            <h2 className={sectionTitle}>{b.title || LIST_SOURCES.find((s) => s.id === b.source)?.label}</h2>
            {content}
          </section>
        );
      }
      case "image":
        if (!b.image) return null;
        return (
          <figure className={b.width === "narrow" ? "mx-auto max-w-2xl" : ""}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.image} alt={b.caption} loading="lazy" className="w-full rounded-2xl border border-line object-cover" />
            {b.caption && <figcaption className="mt-2 text-sm text-muted">{b.caption}</figcaption>}
          </figure>
        );
      case "links":
        if (b.items.length === 0) return null;
        return (
          <section>
            {b.title && <h2 className={sectionTitle}>{b.title}</h2>}
            <ul className="flex flex-wrap gap-2">
              {b.items.map((l, i) => (
                <li key={i}>
                  {l.url.startsWith("/") ? (
                    <Link href={l.url} className="inline-flex rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      case "divider":
        return b.style === "line" ? <hr className="border-line" /> : <div aria-hidden className="h-8" />;
      case "search":
        return (
          <form method="get" action="/wiki/suche" role="search" className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-accent">
            <Search className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
            <input type="search" name="q" placeholder="Im Wiki suchen" aria-label="Im Wiki suchen" className="w-full bg-transparent py-2.5 text-fg outline-none" />
          </form>
        );
      case "shortcuts":
        return (
          <nav aria-label="Ansichten" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] @xl:mx-0 @xl:flex-wrap @xl:px-0 [&::-webkit-scrollbar]:hidden">
            {SHORTCUTS.map(({ href, label, Icon }) => (
              <Link key={href} href={href} prefetch={href === "/wiki/zufall" ? false : undefined} className={chip}>
                <Icon className="h-4 w-4" strokeWidth={2} />
                {label}
              </Link>
            ))}
          </nav>
        );
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {(
        <div className="-mb-4 flex flex-wrap items-center justify-end gap-2 text-sm">
          <Link href="/wiki/uebersicht" className="rounded-lg px-3 py-1.5 text-fg-soft transition hover:bg-surface-2 hover:text-fg">
            Übersicht
          </Link>
          {canEdit && (
            <Link href="/wiki?bearbeiten=1" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              <LayoutTemplate className="h-4 w-4" strokeWidth={2} />
              Startseite anpassen
            </Link>
          )}
        </div>
      )}
      {blocks.map((b) => {
        const node = render(b);
        return node ? <div key={b.id}>{node}</div> : null;
      })}
    </div>
  );
}
