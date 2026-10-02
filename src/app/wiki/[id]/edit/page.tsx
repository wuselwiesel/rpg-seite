import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWikiFolders, getWikiPageRows } from "@/lib/wiki-data";
import { buildWikiTree, folderOptions, pageOptions, pageSubtreeIds } from "@/lib/wiki-tree";
import type { WikiPage } from "@/lib/types";
import { WikiForm } from "../../wiki-form";

export default async function EditWikiPagePage({ params }: PageProps<"/wiki/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase.from("wiki_pages").select("*").eq("id", id).maybeSingle<WikiPage>();
  if (!page) notFound();

  const [folders, pages] = await Promise.all([getWikiFolders(page.world_id), getWikiPageRows(page.world_id)]);
  const tree = buildWikiTree(folders, pages);

  return (
    <div>
      <h1 className="mb-6 font-serif text-4xl text-fg">Eintrag bearbeiten</h1>
      <WikiForm
        page={page}
        folders={folderOptions(tree.folders)}
        // Eine Seite darf weder unter sich selbst noch unter ihren eigenen Unterseiten liegen.
        parentChoices={pageOptions(tree, pageSubtreeIds(pages, page.id))}
        linkTargets={pages.filter((p) => p.id !== page.id).map((p) => ({ id: p.id, title: p.title })).sort((a, b) => a.title.localeCompare(b.title, "de"))}
      />
    </div>
  );
}
