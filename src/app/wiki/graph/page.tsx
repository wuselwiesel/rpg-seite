import { redirect } from "next/navigation";
import { Network } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiLinkPages, getWikiPageRows } from "@/lib/wiki-data";
import { buildLinkEdges } from "@/lib/wiki-links";
import { WikiCrumbs } from "../wiki-crumbs";
import { WikiGraph, type GraphPage } from "./wiki-graph";

export default async function WikiGraphPage({ searchParams }: PageProps<"/wiki/graph">) {
  const sp = await searchParams;
  const fokus = Array.isArray(sp.fokus) ? sp.fokus[0] : sp.fokus;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [rows, linkPages] = await Promise.all([getWikiPageRows(world.id), getWikiLinkPages(world.id)]);
  const parentById = new Map(rows.map((r) => [r.id, r.parent_page_id]));
  const edges = buildLinkEdges(linkPages.map((p) => ({ ...p, parent_page_id: parentById.get(p.id) ?? null })));
  const pages: GraphPage[] = rows.map((r) => ({ id: r.id, title: r.title, page_type: r.page_type ?? null, tags: r.tags ?? [], lead: r.lead ?? null }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <WikiCrumbs crumbs={[]} />
        <h1 className="flex items-center gap-3 font-serif text-4xl text-fg @xl:text-5xl">
          <Network className="h-8 w-8 text-accent" strokeWidth={1.5} />
          Wiki-Graph
        </h1>
        <p className="max-w-prose text-fg-soft">Wie hängen die Seiten zusammen? Jede Verlinkung mit @ oder [[Titel]] und jede Erwähnung eines Titels ist eine Linie.</p>
      </header>
      <WikiGraph pages={pages} edges={edges} initialFocusId={fokus} />
    </div>
  );
}
