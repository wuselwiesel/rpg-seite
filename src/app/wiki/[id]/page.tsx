import { EmojiHtml, EmojiText } from "@/components/custom-emoji-provider";
import { WikiGallery } from "@/components/wiki-gallery";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { MapPin, Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { sanitizePostHtml } from "@/lib/sanitize";
import { autolinkHtml } from "@/lib/autolink";
import { getWikiTerms } from "@/lib/wiki-terms";
import { getMapsForPage } from "@/lib/wiki-map-data";
import { getWikiFavoriteIds, getWikiFolders, getWikiLinkPages, getWikiPageRows } from "@/lib/wiki-data";
import { buildWikiTree, folderPath, pageAncestors, type TreePage } from "@/lib/wiki-tree";
import { findBacklinks } from "@/lib/wiki-links";
import { addHeadingIds } from "@/lib/wiki-html";
import { formatDateTime } from "@/lib/format";
import type { WikiPage } from "@/lib/types";
import { stripHtml } from "@/lib/strip-html";
import { WikiTile } from "@/components/wiki-tile";
import { WikiTypeBadge } from "@/components/wiki-type-icon";
import { PageCard } from "../wiki-cards";
import { WikiCrumbs } from "../wiki-crumbs";
import { DeleteWikiPageButton } from "./delete-wiki-page-button";
import { FavoriteButton } from "./favorite-button";
import { PublishButton } from "./publish-button";

export default async function WikiPageDetailPage({ params }: PageProps<"/wiki/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase.from("wiki_pages").select("*").eq("id", id).maybeSingle<WikiPage>();
  if (!page) notFound();

  const world = await getActiveWorld(user.id);
  const worldOwnerId =
    world?.id === page.world_id
      ? world.created_by
      : (await supabase.from("worlds").select("created_by").eq("id", page.world_id).maybeSingle()).data?.created_by;
  const canDelete = page.created_by === user.id || worldOwnerId === user.id;

  const [wikiTerms, folders, pageRows, linkPages, favoriteIds, onMaps] = await Promise.all([
    getWikiTerms(page.world_id),
    getWikiFolders(page.world_id),
    getWikiPageRows(page.world_id),
    getWikiLinkPages(page.world_id),
    getWikiFavoriteIds(user.id),
    getMapsForPage(page.id),
  ]);

  const tree = buildWikiTree(folders, pageRows);
  const findNode = (list: TreePage[]): TreePage | null => {
    for (const p of list) {
      if (p.id === page.id) return p;
      const hit = findNode(p.children);
      if (hit) return hit;
    }
    return null;
  };
  const allRoots: TreePage[] = [...tree.loose];
  const collect = (list: typeof tree.folders) => {
    for (const f of list) {
      allRoots.push(...f.pages);
      collect(f.children);
    }
  };
  collect(tree.folders);
  const node = findNode(allRoots);

  const folderTrail = folderPath(folders, page.folder_id ?? null);
  const pageTrail = pageAncestors(pageRows, page.id);
  const backlinks = findBacklinks(linkPages, page.id)
    .map((bid) => pageRows.find((p) => p.id === bid))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const linked = autolinkHtml(sanitizePostHtml(page.content), { wiki: wikiTerms, excludeWikiId: page.id });
  const { html, headings } = addHeadingIds(linked);
  const fields = page.fields ?? [];
  const gallery = page.gallery ?? [];
  const isEmpty = stripHtml(page.content ?? "").trim() === "" && !/<img\b/i.test(page.content ?? "");
  // Initiale nur, wenn der erste Absatz mit einem Buchstaben beginnt und lang genug ist, damit sie schön umflossen wird.
  const firstPara = html.match(/^\s*<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
  const dropCap = /^[A-Za-zÄÖÜäöüß]/.test(stripHtml(firstPara).trim()) && stripHtml(firstPara).length >= 150;
  const hasSide = fields.length > 0 || headings.length >= 3;
  const crumbs = [
    ...folderTrail.map((f) => ({ href: `/wiki/ordner/${f.id}`, label: f.name })),
    ...pageTrail.map((p) => ({ href: `/wiki/${p.id}`, label: p.title })),
  ];
  const sectionHead = "mb-4 flex items-baseline gap-2 font-serif text-2xl text-fg";

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-5">
        <WikiCrumbs crumbs={crumbs} />

        {page.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.cover_image_url} alt="" className="aspect-[2/1] max-h-[22rem] w-full rounded-2xl bg-surface-2 object-cover @3xl:aspect-[21/9]" />
        )}

        {page.is_draft && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-accent/60 bg-accent/5 px-4 py-3 text-sm text-fg-soft">
            <span>
              <strong className="font-semibold text-fg">Entwurf.</strong> Nur du siehst diese Seite, bis du sie veröffentlichst.
            </span>
            {page.created_by === user.id && <PublishButton wikiPageId={page.id} />}
          </div>
        )}

        <div className="flex items-start gap-4 @xl:gap-5">
          {!page.cover_image_url && <WikiTile id={page.id} title={page.title} size="lg" />}
          <div className="min-w-0 flex-1">
            {page.page_type && (
              <p className="mb-2">
                <WikiTypeBadge type={page.page_type} />
              </p>
            )}
            <h1 className="font-serif text-4xl leading-[1.05] text-fg [overflow-wrap:anywhere] @xl:text-5xl @4xl:text-6xl">{page.title}</h1>
            {page.lead && (
              <p className="mt-3 max-w-[56ch] font-serif text-xl italic leading-snug text-fg-soft @xl:text-2xl">
                <EmojiText text={page.lead} />
              </p>
            )}
          </div>
        </div>

        {(page.tags ?? []).length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {(page.tags ?? []).map((t) => (
              <li key={t}>
                <Link
                  href={`/wiki/suche?tag=${encodeURIComponent(t)}`}
                  className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-soft transition hover:text-accent"
                >
                  #{t}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-line py-2.5">
          <p className="text-xs text-muted">Zuletzt bearbeitet am {formatDateTime(page.updated_at)}</p>
          <div className="flex flex-wrap items-center gap-1">
            <FavoriteButton wikiPageId={page.id} initial={favoriteIds.includes(page.id)} />
            <Link
              href={`/wiki/${page.id}/edit`}
              className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:text-fg"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              Bearbeiten
            </Link>
            <Link
              href={`/wiki/new?parent=${page.id}`}
              title="Unterseite anlegen"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Unterseite
            </Link>
            {canDelete && <DeleteWikiPageButton wikiPageId={page.id} hasSubpages={(node?.children.length ?? 0) > 0} backTo={page.folder_id ? `/wiki/ordner/${page.folder_id}` : "/wiki"} />}
          </div>
        </div>
      </header>

      <div className={hasSide ? "grid gap-10 @3xl:grid-cols-[minmax(0,1fr)_260px] @3xl:items-start" : ""}>
        {isEmpty ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
            Dieser Artikel hat noch keinen Text.{" "}
            <Link href={`/wiki/${page.id}/edit`} className="text-accent underline underline-offset-2">
              Text ergänzen
            </Link>
          </div>
        ) : (
          <EmojiHtml className={`post-content wiki-prose min-w-0 ${dropCap ? "wiki-dropcap" : ""}`} html={html} />
        )}

        {hasSide && (
          <aside className="order-first flex flex-col gap-6 @3xl:sticky @3xl:top-4 @3xl:order-none">
            {fields.length > 0 && (
              <section aria-label="Steckbrief" className="overflow-hidden rounded-2xl border border-line bg-surface">
                <h2 className="border-b border-line bg-surface-2/60 px-4 py-2.5 font-serif text-lg text-fg">Steckbrief</h2>
                <dl className="grid gap-px bg-line grid-cols-2 @3xl:grid-cols-1">
                  {fields.map((f, i) => (
                    <div key={i} className="flex flex-col gap-0.5 bg-surface px-4 py-2.5 text-sm">
                      <dt className="flex items-center gap-1.5 text-xs text-muted">
                        {f.icon && <EmojiText text={f.icon} />}
                        {f.title}
                      </dt>
                      <dd className="min-w-0 break-words text-fg">
                        <EmojiText text={f.text} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {headings.length >= 3 && (
              <nav aria-label="Auf dieser Seite" className="hidden text-sm @3xl:block">
                <p className="mb-2 font-serif text-lg text-fg">Auf dieser Seite</p>
                <ol className="flex flex-col gap-1.5 border-l border-line pl-3">
                  {headings.map((h) => (
                    <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                      <a href={`#${h.id}`} className="text-muted transition hover:text-accent">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </aside>
        )}
      </div>

      {gallery.length > 0 && (
        <section aria-labelledby="bilder">
          <h2 id="bilder" className={sectionHead}>
            Bilder <span className="text-base text-muted">{gallery.length}</span>
          </h2>
          <WikiGallery urls={gallery} title={page.title} />
        </section>
      )}

      {node && node.children.length > 0 && (
        <section aria-labelledby="unterseiten">
          <h2 id="unterseiten" className={sectionHead}>
            Unterseiten <span className="text-base text-muted">{node.children.length}</span>
          </h2>
          <ul className="grid gap-3 @3xl:grid-cols-2">
            {node.children.map((c) => (
              <li key={c.id}>
                <PageCard page={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {onMaps.length > 0 && (
        <section aria-labelledby="auf-karte">
          <h2 id="auf-karte" className={sectionHead}>
            Auf der Karte <span className="text-base text-muted">{onMaps.length}</span>
          </h2>
          <ul className="flex flex-wrap gap-2">
            {onMaps.map((m) => (
              <li key={m.pinId}>
                <Link
                  href={`/wiki/karten/${m.mapId}?pin=${m.pinId}`}
                  className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-sm text-fg-soft transition hover:text-accent"
                >
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                  {m.mapTitle}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {backlinks.length > 0 && (
        <section aria-labelledby="verlinkt">
          <h2 id="verlinkt" className={sectionHead}>
            Verlinkt von <span className="text-base text-muted">{backlinks.length}</span>
          </h2>
          <ul className="flex flex-wrap gap-2">
            {backlinks.map((p) => (
              <li key={p.id}>
                <Link href={`/wiki/${p.id}`} className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-3 text-sm text-fg-soft transition hover:text-accent">
                  <WikiTile id={p.id} title={p.title} cover={p.cover_image_url} size="sm" />
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
