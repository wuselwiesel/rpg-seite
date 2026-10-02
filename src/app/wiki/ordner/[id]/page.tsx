import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiFolders, getWikiPageRows } from "@/lib/wiki-data";
import { buildWikiTree, findFolder, folderPath, type TreePage } from "@/lib/wiki-tree";
import { FolderActionsBar } from "../../folder-actions-bar";

function PageRows({ pages, depth = 0 }: { pages: TreePage[]; depth?: number }) {
  return (
    <>
      {pages.map((p) => (
        <li key={p.id} className="border-t border-line first:border-t-0">
          <Link
            href={`/wiki/${p.id}`}
            style={{ paddingLeft: `${depth * 20 + 4}px` }}
            className="flex flex-col py-2.5 pr-1 transition hover:bg-surface-2"
          >
            <span className="font-medium text-fg">
              {depth > 0 && <span className="mr-1.5 text-muted">↳</span>}
              {p.title}
            </span>
            {p.lead && <span className="line-clamp-1 text-sm text-fg-soft">{p.lead}</span>}
          </Link>
          {p.children.length > 0 && (
            <ul>
              <PageRows pages={p.children} depth={depth + 1} />
            </ul>
          )}
        </li>
      ))}
    </>
  );
}

export default async function WikiFolderPage({ params }: PageProps<"/wiki/ordner/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [folders, pages] = await Promise.all([getWikiFolders(world.id), getWikiPageRows(world.id)]);
  const tree = buildWikiTree(folders, pages);
  const folder = findFolder(tree.folders, id);
  if (!folder) notFound();

  const trail = folderPath(folders, folder.parent_id);
  const canDelete = folder.created_by === user.id || world.created_by === user.id;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <nav aria-label="Pfad" className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <Link href="/wiki" className="hover:text-accent">
            Wiki
          </Link>
          {trail.map((f) => (
            <span key={f.id} className="flex items-center gap-2">
              <span aria-hidden>›</span>
              <Link href={`/wiki/ordner/${f.id}`} className="hover:text-accent">
                {f.name}
              </Link>
            </span>
          ))}
        </nav>
        <h1 className="mt-1 font-serif text-4xl text-fg">{folder.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {folder.total} {folder.total === 1 ? "Artikel" : "Artikel"}
        </p>
      </div>

      <FolderActionsBar folder={folder} tree={tree.folders} allFolders={folders} canDelete={canDelete} />

      {folder.children.length > 0 && (
        <section>
          <h2 className="mb-2 font-serif text-2xl text-fg">Unterordner</h2>
          <ul className="border-y border-line">
            {folder.children.map((c) => (
              <li key={c.id} className="border-t border-line first:border-t-0">
                <Link href={`/wiki/ordner/${c.id}`} className="flex items-baseline justify-between gap-4 px-1 py-3 transition hover:bg-surface-2">
                  <span className="font-medium text-fg">{c.name}</span>
                  <span className="text-sm text-muted">{c.total} Artikel</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        {folder.children.length > 0 && <h2 className="mb-2 font-serif text-2xl text-fg">Artikel</h2>}
        {folder.pages.length > 0 ? (
          <ul className="border-y border-line">
            <PageRows pages={folder.pages} />
          </ul>
        ) : folder.children.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line p-5 text-muted">
            <p>In diesem Ordner liegt noch nichts.</p>
          </div>
        ) : (
          <p className="text-sm text-muted">Keine Artikel direkt in diesem Ordner.</p>
        )}
      </section>
    </div>
  );
}
