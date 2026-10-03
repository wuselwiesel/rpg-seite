import { notFound, redirect } from "next/navigation";
import { Folder } from "lucide-react";
import { FolderGlyph } from "@/components/folder-glyph";
import { folderColorHex } from "@/lib/wiki-folder-style";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiFolders, getWikiPageRows } from "@/lib/wiki-data";
import { buildWikiTree, findFolder, folderPath } from "@/lib/wiki-tree";
import { FolderActionsBar } from "../../folder-actions-bar";
import { FolderCard, PageCard } from "../../wiki-cards";
import { WikiCrumbs } from "../../wiki-crumbs";

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
  const hex = folderColorHex(folder.color);
  const canDelete = folder.created_by === user.id || world.created_by === user.id;
  const counts = [
    `${folder.total} ${folder.total === 1 ? "Artikel" : "Artikel"}`,
    folder.children.length > 0 ? `${folder.children.length} ${folder.children.length === 1 ? "Unterordner" : "Unterordner"}` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-5">
        <WikiCrumbs crumbs={trail.map((f) => ({ href: `/wiki/ordner/${f.id}`, label: f.name }))} />
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${hex ? "" : "bg-surface-3 text-accent"}`}
            style={hex ? { backgroundColor: `color-mix(in srgb, ${hex} 22%, transparent)`, color: hex } : undefined}
          >
            {folder.icon ? <FolderGlyph icon={folder.icon} textClass="text-4xl" /> : <Folder className="h-8 w-8" strokeWidth={1.5} />}
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-4xl leading-none text-fg @xl:text-5xl">{folder.name}</h1>
            <p className="mt-2 text-sm text-muted">{counts.join(", ")}</p>
          </div>
        </div>
        <FolderActionsBar folder={folder} tree={tree.folders} allFolders={folders} canDelete={canDelete} />
      </header>

      {folder.children.length > 0 && (
        <section aria-labelledby="unterordner">
          <h2 id="unterordner" className="mb-4 font-serif text-2xl text-fg">
            Unterordner
          </h2>
          <ul className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
            {folder.children.map((c, i) => (
              <li key={c.id}>
                <FolderCard folder={c} index={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="artikel">
        {folder.children.length > 0 && (
          <h2 id="artikel" className="mb-4 font-serif text-2xl text-fg">
            Artikel
          </h2>
        )}
        {folder.pages.length > 0 ? (
          <ul className="grid gap-3 @3xl:grid-cols-2">
            {folder.pages.map((p) => (
              <li key={p.id}>
                <PageCard page={p} />
              </li>
            ))}
          </ul>
        ) : folder.children.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
            In diesem Ordner liegt noch nichts. Lege den ersten Artikel an oder sortiere mit einem Unterordner vor.
          </div>
        ) : (
          <p className="text-sm text-muted">Keine Artikel direkt in diesem Ordner.</p>
        )}
      </section>
    </div>
  );
}
