import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorldRights } from "@/lib/world-rights";
import { canEditWikiPage } from "@/lib/world-permissions";
import { getWikiFolders, getWikiPageRows } from "@/lib/wiki-data";
import { buildWikiTree, folderOptions, pageOptions, pageSubtreeIds } from "@/lib/wiki-tree";
import type { WikiPage } from "@/lib/types";
import { getWorldCharacterTerms } from "@/lib/wiki-characters";
import { getWikiCalendar } from "@/lib/wiki-calendar-data";
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
  if (!canEditWikiPage(await getWorldRights(page.world_id, user.id), page.created_by, user.id)) redirect(`/wiki/${page.id}`);

  const [folders, pages, characters] = await Promise.all([getWikiFolders(page.world_id), getWikiPageRows(page.world_id), getWorldCharacterTerms(page.world_id)]);
  const tree = buildWikiTree(folders, pages);
  // Geheime Felder gibt es nur auf der Seite einer Figur und nur für deren Besitzer:in
  let secretFields: { icon: string; title: string; text: string }[] | null = null;
  if (page.character_id) {
    const { data: owns } = await supabase.rpc("owns_wiki_character_page", { p_page: page.id });
    if (owns) {
      const { data: secret } = await supabase.from("wiki_page_secrets").select("fields").eq("page_id", page.id).maybeSingle<{ fields: { icon: string; title: string; text: string }[] }>();
      secretFields = secret?.fields ?? [];
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-serif text-4xl text-fg">Eintrag bearbeiten</h1>
      <WikiForm
        page={page}
        canSetDraft={page.created_by === user.id}
        secretFields={secretFields}
        folders={folderOptions(tree.folders)}
        // Eine Seite darf weder unter sich selbst noch unter ihren eigenen Unterseiten liegen.
        parentChoices={pageOptions(tree, pageSubtreeIds(pages, page.id))}
        calendar={await getWikiCalendar(page.world_id)}
        characters={characters.map((c) => ({ id: c.id, name: c.name, avatar_url: c.avatarUrl }))}
        linkTargets={pages.filter((p) => p.id !== page.id).map((p) => ({ id: p.id, title: p.title })).sort((a, b) => a.title.localeCompare(b.title, "de"))}
      />
    </div>
  );
}
