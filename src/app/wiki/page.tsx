import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiFolders, getWikiLinkPages, getWikiPageRows } from "@/lib/wiki-data";
import { buildWikiTree, folderPath } from "@/lib/wiki-tree";
import { findMissingLinks } from "@/lib/wiki-links";
import { formatDate } from "@/lib/format";

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
  const missing = findMissingLinks(linkPages).slice(0, 8);

  if (pageRows.length === 0 && folders.length === 0) {
    return (
      <div>
        <h1 className="font-serif text-4xl text-fg">{world.name}</h1>
        <p className="mt-2 max-w-prose text-fg-soft">
          Hier sammelt ihr Wissen über eure Welt: Orte, Wesen, Gruppen, Regeln. Lege Ordner an, um zu sortieren, und
          verlinke Seiten untereinander mit [[Titel]].
        </p>
        <Link
          href="/wiki/new"
          className="mt-5 inline-block rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          Ersten Artikel anlegen
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-serif text-4xl text-fg">{world.name}</h1>
        <p className="mt-2 text-fg-soft">
          {pageRows.length} {pageRows.length === 1 ? "Artikel" : "Artikel"} in {folders.length} {folders.length === 1 ? "Ordner" : "Ordnern"}.
        </p>
      </div>

      {tree.folders.length > 0 && (
        <section>
          <h2 className="mb-2 font-serif text-2xl text-fg">Ordner</h2>
          <ul className="border-y border-line">
            {tree.folders.map((f) => (
              <li key={f.id} className="border-t border-line first:border-t-0">
                <Link href={`/wiki/ordner/${f.id}`} className="flex items-baseline justify-between gap-4 px-1 py-3 transition hover:bg-surface-2">
                  <span className="font-medium text-fg">{f.name}</span>
                  <span className="text-sm text-muted">
                    {f.total} {f.total === 1 ? "Artikel" : "Artikel"}
                    {f.children.length > 0 && ` · ${f.children.length} ${f.children.length === 1 ? "Unterordner" : "Unterordner"}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-10 @2xl:grid-cols-2">
        <section>
          <h2 className="mb-2 font-serif text-2xl text-fg">Zuletzt bearbeitet</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Noch nichts.</p>
          ) : (
            <ul className="border-y border-line">
              {recent.map((p) => (
                <li key={p.id} className="border-t border-line first:border-t-0">
                  <Link href={`/wiki/${p.id}`} className="flex items-baseline justify-between gap-4 px-1 py-2.5 transition hover:bg-surface-2">
                    <span className="min-w-0">
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
          )}
        </section>

        <section>
          <h2 className="mb-1 font-serif text-2xl text-fg">Fehlende Artikel</h2>
          <p className="mb-2 text-sm text-muted">Diese Begriffe sind mit [[…]] verlinkt, haben aber noch keine Seite.</p>
          {missing.length === 0 ? (
            <p className="text-sm text-muted">Alle Verlinkungen führen zu einer Seite.</p>
          ) : (
            <ul className="border-y border-line">
              {missing.map((m) => (
                <li key={m.title} className="border-t border-line first:border-t-0">
                  <Link
                    href={`/wiki/new?title=${encodeURIComponent(m.title)}`}
                    className="flex items-baseline justify-between gap-4 px-1 py-2.5 transition hover:bg-surface-2"
                  >
                    <span className="wiki-missing-text font-medium">{m.title}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {m.count} {m.count === 1 ? "Erwähnung" : "Erwähnungen"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
