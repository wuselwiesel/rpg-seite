import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiFolders, getWikiLinkPages, getWikiPageRows, getWikiTypes } from "@/lib/wiki-data";
import { buildWikiTree, folderOptions, folderPath } from "@/lib/wiki-tree";
import { searchWiki, type SearchEntry } from "@/lib/wiki-search";
import { tagCounts } from "@/lib/wiki-tags";
import { stripHtml } from "@/lib/strip-html";
import { WikiTile } from "@/components/wiki-tile";
import { WikiTypeBadge } from "@/components/wiki-type-icon";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const field = "rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent";

export default async function WikiSearchPage({ searchParams }: PageProps<"/wiki/suche">) {
  const sp = await searchParams;
  const q = first(sp.q).slice(0, 100);
  const type = first(sp.type).slice(0, 40);
  const tag = first(sp.tag).slice(0, 40);
  const folderId = first(sp.ordner);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [folders, rows, linkPages, types] = await Promise.all([
    getWikiFolders(world.id),
    getWikiPageRows(world.id),
    getWikiLinkPages(world.id),
    getWikiTypes(world.id),
  ]);
  const tree = buildWikiTree(folders, rows);
  const textById = new Map(linkPages.map((p) => [p.id, { text: stripHtml(p.content ?? ""), aliases: p.aliases }]));
  const entries: (SearchEntry & { cover_image_url?: string | null; icon_url?: string | null; is_draft?: boolean })[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    lead: r.lead,
    aliases: textById.get(r.id)?.aliases ?? [],
    text: textById.get(r.id)?.text ?? "",
    page_type: r.page_type,
    tags: r.tags,
    folder_id: r.folder_id,
    updated_at: r.updated_at,
    cover_image_url: r.cover_image_url,
    icon_url: r.icon_url,
    is_draft: r.is_draft,
  }));
  const filtering = Boolean(q || type || tag || folderId);
  const hits = filtering ? searchWiki(entries, folders, { q, type, tag, folderId }) : [];
  const tags = tagCounts(rows);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <h1 className="font-serif text-4xl text-fg @xl:text-5xl">Suche</h1>
        <form method="get" action="/wiki/suche" role="search" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <label className="flex items-center gap-2 rounded-lg border border-line bg-app px-3 focus-within:border-accent">
            <Search className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Titel, Alternativnamen und Text durchsuchen"
              aria-label="Suchbegriff"
              className="w-full bg-transparent py-2 text-fg outline-none"
            />
          </label>
          <div className="grid gap-3 @xl:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Art
              <select name="type" defaultValue={type} className={field}>
                <option value="">Alle</option>
                {types.map((t) => (
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
            <label className="flex flex-col gap-1 text-xs text-muted">
              Ordner
              <select name="ordner" defaultValue={folderId} className={field}>
                <option value="">Alle</option>
                {folderOptions(tree.folders).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
              Suchen
            </button>
            {filtering && (
              <Link href="/wiki/suche" className="text-sm text-muted hover:text-fg">
                Zurücksetzen
              </Link>
            )}
          </div>
        </form>
      </header>

      {!filtering ? (
        <p className="text-fg-soft">Gib einen Suchbegriff ein oder wähle einen Filter, zum Beispiel eine Art oder einen Tag.</p>
      ) : hits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-6 text-fg-soft">
          Nichts gefunden.{" "}
          {q && (
            <Link href={`/wiki/new?title=${encodeURIComponent(q)}`} className="text-accent underline underline-offset-2">
              Seite „{q}“ anlegen
            </Link>
          )}
        </div>
      ) : (
        <section aria-live="polite" aria-label="Treffer">
          <p className="mb-3 text-sm text-muted">{hits.length === 1 ? "1 Treffer" : `${hits.length} Treffer`}</p>
          <ul className="flex flex-col gap-2">
            {hits.slice(0, 60).map(({ entry, snippet }) => (
              <li key={entry.id}>
                <Link href={`/wiki/${entry.id}`} className="flex gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:border-accent/50 hover:bg-surface-2/50">
                  <WikiTile id={entry.id} title={entry.title} cover={entry.cover_image_url} icon={entry.icon_url} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-xl text-fg">{entry.title}</span>
                      <WikiTypeBadge type={entry.page_type} />
                      {entry.is_draft && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">Entwurf</span>}
                    </span>
                    {snippet && <span className="mt-0.5 line-clamp-2 block text-sm text-fg-soft">{snippet}</span>}
                    <span className="mt-1 block truncate text-xs text-muted">
                      {folderPath(folders, entry.folder_id).map((f) => f.name).join(" › ") || "Ohne Ordner"}
                      {(entry.tags ?? []).length > 0 && ` · ${(entry.tags ?? []).map((t) => `#${t}`).join(" ")}`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
