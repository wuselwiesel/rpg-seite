import { EmojiHtml, EmojiText } from "@/components/custom-emoji-provider";
import { WikiGallery } from "@/components/wiki-gallery";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { sanitizePostHtml } from "@/lib/sanitize";
import { autolinkHtml } from "@/lib/autolink";
import { getWikiTerms } from "@/lib/wiki-terms";
import { getWikiFolders, getWikiLinkPages, getWikiPageRows } from "@/lib/wiki-data";
import { buildWikiTree, folderPath, pageAncestors, type TreePage } from "@/lib/wiki-tree";
import { findBacklinks } from "@/lib/wiki-links";
import { addHeadingIds } from "@/lib/wiki-html";
import { formatDateTime } from "@/lib/format";
import type { WikiPage } from "@/lib/types";
import { DeleteWikiPageButton } from "./delete-wiki-page-button";

function SubpageRows({ pages, depth = 0 }: { pages: TreePage[]; depth?: number }) {
  return (
    <>
      {pages.map((p) => (
        <li key={p.id}>
          <Link
            href={`/wiki/${p.id}`}
            style={{ paddingLeft: `${depth * 18 + 4}px` }}
            className="flex flex-col border-t border-line py-2 pr-1 transition hover:bg-surface-2"
          >
            <span className="font-medium text-fg">
              {depth > 0 && <span className="mr-1.5 text-muted">↳</span>}
              {p.title}
            </span>
            {p.lead && <span className="line-clamp-1 text-sm text-fg-soft">{p.lead}</span>}
          </Link>
          {p.children.length > 0 && (
            <ul>
              <SubpageRows pages={p.children} depth={depth + 1} />
            </ul>
          )}
        </li>
      ))}
    </>
  );
}

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

  const [wikiTerms, folders, pageRows, linkPages] = await Promise.all([
    getWikiTerms(page.world_id),
    getWikiFolders(page.world_id),
    getWikiPageRows(page.world_id),
    getWikiLinkPages(page.world_id),
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
  const hasSide = fields.length > 0 || headings.length >= 3;

  return (
    <article className="flex flex-col gap-6">
      <div>
        <nav aria-label="Pfad" className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <Link href="/wiki" className="hover:text-accent">
            Wiki
          </Link>
          {folderTrail.map((f) => (
            <span key={f.id} className="flex items-center gap-2">
              <span aria-hidden>›</span>
              <Link href={`/wiki/ordner/${f.id}`} className="hover:text-accent">
                {f.name}
              </Link>
            </span>
          ))}
          {pageTrail.map((p) => (
            <span key={p.id} className="flex items-center gap-2">
              <span aria-hidden>›</span>
              <Link href={`/wiki/${p.id}`} className="hover:text-accent">
                {p.title}
              </Link>
            </span>
          ))}
        </nav>

        <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h1 className="font-serif text-4xl text-fg sm:text-5xl">{page.title}</h1>
          <div className="flex items-center gap-1 pt-2">
            <Link
              href={`/wiki/${page.id}/edit`}
              className="flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm text-fg-soft transition hover:text-fg"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              Bearbeiten
            </Link>
            <Link
              href={`/wiki/new?parent=${page.id}`}
              title="Unterseite anlegen"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Unterseite
            </Link>
            {canDelete && <DeleteWikiPageButton wikiPageId={page.id} hasSubpages={(node?.children.length ?? 0) > 0} backTo={page.folder_id ? `/wiki/ordner/${page.folder_id}` : "/wiki"} />}
          </div>
        </div>

        {page.lead && (
          <p className="mt-3 max-w-prose text-lg text-fg-soft">
            <EmojiText text={page.lead} />
          </p>
        )}
        <p className="mt-2 text-xs text-muted">Zuletzt bearbeitet am {formatDateTime(page.updated_at)}</p>
      </div>

      {page.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.cover_image_url} alt="" className="aspect-[16/9] w-full rounded-xl bg-surface-2 object-cover" />
      )}

      <div className={hasSide ? "grid gap-8 @2xl:grid-cols-[minmax(0,1fr)_230px]" : ""}>
        <EmojiHtml className="post-content min-w-0 text-fg-soft" html={html} />

        {hasSide && (
          <aside className="flex flex-col gap-6 @2xl:sticky @2xl:top-4 @2xl:self-start">
            {fields.length > 0 && (
              <dl className="overflow-hidden rounded-xl border border-line bg-surface">
                {fields.map((f, i) => (
                  <div key={i} className={`flex items-baseline justify-between gap-4 px-3.5 py-2.5 text-sm ${i > 0 ? "border-t border-line" : ""}`}>
                    <dt className="flex shrink-0 items-center gap-1.5 text-muted">
                      {f.icon && <EmojiText text={f.icon} />}
                      {f.title}
                    </dt>
                    <dd className="min-w-0 break-words text-right text-fg">
                      <EmojiText text={f.text} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {headings.length >= 3 && (
              <nav aria-label="Auf dieser Seite" className="text-sm">
                <p className="mb-1 font-serif text-lg text-fg">Auf dieser Seite</p>
                <ol className="flex flex-col gap-1">
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
        <section>
          <h2 className="mb-2 font-serif text-2xl text-fg">Bilder</h2>
          <WikiGallery urls={gallery} title={page.title} />
        </section>
      )}

      {node && node.children.length > 0 && (
        <section>
          <h2 className="mb-2 font-serif text-2xl text-fg">Unterseiten</h2>
          <ul className="border-b border-line">
            <SubpageRows pages={node.children} />
          </ul>
        </section>
      )}

      {backlinks.length > 0 && (
        <section>
          <h2 className="mb-2 font-serif text-2xl text-fg">Verlinkt von</h2>
          <ul className="flex flex-wrap gap-2">
            {backlinks.map((p) => (
              <li key={p.id}>
                <Link href={`/wiki/${p.id}`} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-fg-soft transition hover:text-accent">
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
