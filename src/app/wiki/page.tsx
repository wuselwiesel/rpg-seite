import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, Shuffle, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiFavoriteIds, getWikiFolders, getWikiLinkPages, getWikiPageRows } from "@/lib/wiki-data";
import { buildWikiTree, folderPath, type PageRow } from "@/lib/wiki-tree";
import { tagCounts } from "@/lib/wiki-tags";
import { WIKI_TYPES } from "@/lib/wiki-types";
import { WikiTypeIcon } from "@/components/wiki-type-icon";
import { findMissingLinks } from "@/lib/wiki-links";
import { formatDate } from "@/lib/format";
import { WikiTile } from "@/components/wiki-tile";
import { FolderCard } from "./wiki-cards";
import { NewFolderButton } from "./new-folder-button";

const primary =
  "flex items-center gap-1.5 rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

// Eine Zeile mit Kachel, Titel und Pfad; für „Zuletzt bearbeitet“, „Neu“, Favoriten und Entwürfe.
function PageLine({ p, folders, note }: { p: PageRow; folders: Parameters<typeof folderPath>[0]; note?: string }) {
  return (
    <Link href={`/wiki/${p.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2">
      <WikiTile id={p.id} title={p.title} cover={p.cover_image_url} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate font-medium text-fg">
          <WikiTypeIcon type={p.page_type} className="h-3.5 w-3.5 shrink-0 text-muted" />
          <span className="truncate">{p.title}</span>
        </span>
        <span className="block truncate text-xs text-muted">{folderPath(folders, p.folder_id).map((f) => f.name).join(" › ") || "Ohne Ordner"}</span>
      </span>
      {note && <span className="shrink-0 text-xs text-muted">{note}</span>}
    </Link>
  );
}

const sectionTitle = "mb-4 font-serif text-2xl text-fg";

export default async function WikiHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [folders, pageRows, linkPages, favoriteIds] = await Promise.all([
    getWikiFolders(world.id),
    getWikiPageRows(world.id),
    getWikiLinkPages(world.id),
    getWikiFavoriteIds(user.id),
  ]);
  const tree = buildWikiTree(folders, pageRows);
  const published = pageRows.filter((p) => !p.is_draft);
  const recent = [...published].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")).slice(0, 6);
  const newest = [...published].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 6);
  const drafts = pageRows.filter((p) => p.is_draft && p.created_by === user.id);
  const favorites = favoriteIds.map((id) => pageRows.find((p) => p.id === id)).filter((p): p is PageRow => Boolean(p));
  const tags = tagCounts(published).slice(0, 24);
  const typeCounts = WIKI_TYPES.map((t) => ({ type: t, count: published.filter((p) => p.page_type === t.id).length })).filter((t) => t.count > 0);
  const missing = findMissingLinks(linkPages).slice(0, 12);

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Link href="/wiki/new" className={primary}>
        <Plus className="h-4 w-4" strokeWidth={2.25} />
        Neuer Artikel
      </Link>
      <NewFolderButton tree={tree.folders} allFolders={folders} />
      <Link
        href="/wiki/zufall"
        prefetch={false}
        className="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm text-fg-soft transition hover:border-accent hover:text-accent"
      >
        <Shuffle className="h-4 w-4" strokeWidth={2} />
        Zufällige Seite
      </Link>
    </div>
  );

  if (pageRows.length === 0 && folders.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 rounded-2xl border border-dashed border-line p-6 @xl:p-10">
        <h1 className="font-serif text-4xl text-fg @xl:text-5xl">{world.name}</h1>
        <p className="max-w-prose text-fg-soft">
          Hier sammelt ihr das Wissen über eure Welt: Orte, Wesen, Gruppen, Regeln. Sortiert es in Ordner und verlinkt
          Artikel untereinander mit [[Titel]].
        </p>
        {actions}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="font-serif text-4xl leading-none text-fg @xl:text-6xl">{world.name}</h1>
          <p className="mt-3 text-fg-soft">
            {plural(pageRows.length, "Artikel", "Artikel")} in {plural(folders.length, "Ordner", "Ordnern")}
          </p>
        </div>
        {actions}
      </header>

      <form method="get" action="/wiki/suche" role="search" className="-mt-6 flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-accent">
        <Search className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
        <input type="search" name="q" placeholder="Im Wiki suchen" aria-label="Im Wiki suchen" className="w-full bg-transparent py-2.5 text-fg outline-none" />
        <Link href="/wiki/suche" className="shrink-0 text-xs text-muted hover:text-accent">
          Filter
        </Link>
      </form>

      {drafts.length > 0 && (
        <section aria-labelledby="entwuerfe" className="rounded-2xl border border-dashed border-accent/50 p-4">
          <h2 id="entwuerfe" className={sectionTitle}>
            Meine Entwürfe <span className="text-base text-muted">{drafts.length}</span>
          </h2>
          <p className="-mt-2 mb-3 text-sm text-muted">Nur du siehst diese Seiten, bis du sie veröffentlichst.</p>
          <ul className="grid gap-x-6 gap-y-1 @2xl:grid-cols-2">
            {drafts.map((p) => (
              <li key={p.id}>
                <PageLine p={p} folders={folders} note="Entwurf" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {favorites.length > 0 && (
        <section aria-labelledby="favoriten">
          <h2 id="favoriten" className={`${sectionTitle} flex items-center gap-2`}>
            <Star className="h-5 w-5 text-accent" strokeWidth={2} fill="currentColor" />
            Favoriten
          </h2>
          <ul className="grid gap-x-6 gap-y-1 @2xl:grid-cols-2">
            {favorites.map((p) => (
              <li key={p.id}>
                <PageLine p={p} folders={folders} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {typeCounts.length > 0 && (
        <section aria-labelledby="arten">
          <h2 id="arten" className={sectionTitle}>
            Nach Art
          </h2>
          <ul className="flex flex-wrap gap-2">
            {typeCounts.map(({ type, count }) => (
              <li key={type.id}>
                <Link
                  href={`/wiki/suche?type=${type.id}`}
                  className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg-soft transition hover:border-accent hover:text-accent"
                >
                  <WikiTypeIcon type={type.id} className="h-4 w-4" />
                  {type.plural}
                  <span className="text-xs text-muted">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tree.folders.length > 0 && (
        <section aria-labelledby="ordner">
          <h2 id="ordner" className="mb-4 font-serif text-2xl text-fg">
            Ordner
          </h2>
          <ul className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
            {tree.folders.map((f, i) => (
              <li key={f.id}>
                <FolderCard folder={f} index={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section aria-labelledby="zuletzt">
          <h2 id="zuletzt" className={sectionTitle}>
            Zuletzt bearbeitet
          </h2>
          <ul className="grid gap-x-6 gap-y-1 @2xl:grid-cols-2">
            {recent.map((p) => (
              <li key={p.id}>
                <PageLine p={p} folders={folders} note={p.updated_at ? formatDate(p.updated_at.slice(0, 10)) : ""} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {newest.length > 0 && (
        <section aria-labelledby="neu">
          <h2 id="neu" className={sectionTitle}>
            Neu im Wiki
          </h2>
          <ul className="grid gap-x-6 gap-y-1 @2xl:grid-cols-2">
            {newest.map((p) => (
              <li key={p.id}>
                <PageLine p={p} folders={folders} note={p.created_at ? formatDate(p.created_at.slice(0, 10)) : ""} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {tags.length > 0 && (
        <section aria-labelledby="tags">
          <h2 id="tags" className={sectionTitle}>
            Tags
          </h2>
          <ul className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <li key={t.tag}>
                <Link
                  href={`/wiki/suche?tag=${encodeURIComponent(t.tag)}`}
                  className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm text-fg-soft transition hover:text-accent"
                >
                  #{t.tag}
                  <span className="text-xs text-muted">{t.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {missing.length > 0 && (
        <section aria-labelledby="fehlend" className="rounded-2xl border border-dashed border-line p-5">
          <h2 id="fehlend" className="font-serif text-2xl text-fg">
            Fehlende Artikel
          </h2>
          <p className="mt-1 text-sm text-muted">Diese Begriffe sind mit [[…]] verlinkt, aber es gibt noch keine Seite dazu.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {missing.map((m) => (
              <li key={m.title}>
                <Link
                  href={`/wiki/new?title=${encodeURIComponent(m.title)}`}
                  title={`Artikel „${m.title}“ anlegen`}
                  className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-3 pr-2.5 text-sm transition hover:bg-surface-3"
                >
                  <span className="wiki-missing-text font-medium">{m.title}</span>
                  <span className="text-xs text-muted">{m.count}×</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
