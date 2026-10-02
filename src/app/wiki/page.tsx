import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiFolders, getWikiLinkPages, getWikiPageRows } from "@/lib/wiki-data";
import { buildWikiTree, folderPath } from "@/lib/wiki-tree";
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

export default async function WikiHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [folders, pageRows, linkPages] = await Promise.all([
    getWikiFolders(world.id),
    getWikiPageRows(world.id),
    getWikiLinkPages(world.id),
  ]);
  const tree = buildWikiTree(folders, pageRows);
  const recent = [...pageRows].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")).slice(0, 6);
  const missing = findMissingLinks(linkPages).slice(0, 12);

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Link href="/wiki/new" className={primary}>
        <Plus className="h-4 w-4" strokeWidth={2.25} />
        Neuer Artikel
      </Link>
      <NewFolderButton tree={tree.folders} allFolders={folders} />
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
          <h2 id="zuletzt" className="mb-4 font-serif text-2xl text-fg">
            Zuletzt bearbeitet
          </h2>
          <ul className="grid gap-x-6 gap-y-1 @2xl:grid-cols-2">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/wiki/${p.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2">
                  <WikiTile id={p.id} title={p.title} cover={p.cover_image_url} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-fg">{p.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {folderPath(folders, p.folder_id).map((f) => f.name).join(" › ") || "Ohne Ordner"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{p.updated_at ? formatDate(p.updated_at.slice(0, 10)) : ""}</span>
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
