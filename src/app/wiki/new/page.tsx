import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiFolders, getWikiPageRows } from "@/lib/wiki-data";
import { buildWikiTree, folderOptions, pageOptions } from "@/lib/wiki-tree";
import { getWorldCharacterTerms } from "@/lib/wiki-characters";
import { getWikiCalendar } from "@/lib/wiki-calendar-data";
import { WikiForm } from "../wiki-form";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function NewWikiPagePage({ searchParams }: PageProps<"/wiki/new">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [folders, pages, characters] = await Promise.all([getWikiFolders(world.id), getWikiPageRows(world.id), getWorldCharacterTerms(world.id)]);
  const tree = buildWikiTree(folders, pages);

  return (
    <div>
      <h1 className="mb-6 font-serif text-4xl text-fg">Neuer Artikel</h1>
      <WikiForm
        folders={folderOptions(tree.folders)}
        parentChoices={pageOptions(tree)}
        calendar={await getWikiCalendar(world.id)}
        characters={characters.map((c) => ({ id: c.id, name: c.name, avatar_url: c.avatarUrl }))}
        linkTargets={pages.map((p) => ({ id: p.id, title: p.title })).sort((a, b) => a.title.localeCompare(b.title, "de"))}
        defaults={{ title: first(sp.title), folder: first(sp.folder), parent: first(sp.parent), type: first(sp.type) }}
      />
    </div>
  );
}
