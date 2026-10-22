import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorldRights } from "@/lib/world-rights";
import { canEditWikiPage } from "@/lib/world-permissions";
import { getWikiFolders, getWikiPageRows } from "@/lib/wiki-data";
import { buildWikiTree, folderOptions, pageOptions, pageSubtreeIds } from "@/lib/wiki-tree";
import type { WikiPage } from "@/lib/types";
import { getWorldCharacterTerms } from "@/lib/wiki-characters";
import { getWikiCalendar } from "@/lib/wiki-calendar-data";
import type { SecretItem } from "@/lib/secret-items";
import { missingPublicRows, missingSecretRows, parseTemplate } from "@/lib/wiki-template";
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
  // Vorlage der Welt für Figuren-Seiten: fehlende Felder erscheinen als leere Zeilen (ohne Text werden sie nicht gespeichert)
  const { data: worldRow } = page.character_id ? await supabase.from("worlds").select("character_wiki_template").eq("id", page.world_id).maybeSingle<{ character_wiki_template: unknown }>() : { data: null };
  const template = parseTemplate(worldRow?.character_wiki_template);
  // Geheime Felder gibt es nur auf der Seite einer Figur und nur für deren Besitzer:in
  let secretItems: SecretItem[] | null = null;
  let shareTargets: { id: string; name: string; avatarUrl: string | null }[] = [];
  let partnerId: string | null = null;
  let friendId: string | null = null;
  if (page.character_id) {
    const { data: owns } = await supabase.rpc("owns_wiki_character_page", { p_page: page.id });
    if (owns) {
      const [{ data: items }, { data: me }, { data: others }] = await Promise.all([
        supabase.from("wiki_page_secret_items").select("id, icon, title, text, shared_with").eq("page_id", page.id).order("position").returns<SecretItem[]>(),
        supabase.from("characters").select("owner_id, partner_character_id, best_friend_character_id").eq("id", page.character_id).maybeSingle<{ owner_id: string; partner_character_id: string | null; best_friend_character_id: string | null }>(),
        supabase.from("characters").select("id, name, avatar_url, owner_id").eq("world_id", page.world_id).is("deleted_at", null).order("name").returns<{ id: string; name: string; avatar_url: string | null; owner_id: string }[]>(),
      ]);
      secretItems = [...(items ?? []), ...missingSecretRows(template, items ?? [])];
      partnerId = me?.partner_character_id ?? null;
      friendId = me?.best_friend_character_id ?? null;
      shareTargets = (others ?? []).filter((c) => c.owner_id !== me?.owner_id).map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatar_url }));
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-serif text-4xl text-fg">Eintrag bearbeiten</h1>
      <WikiForm
        page={page.character_id ? { ...page, fields: [...(page.fields ?? []), ...missingPublicRows(template, page.fields ?? [])] } : page}
        canSetDraft={page.created_by === user.id}
        secretItems={secretItems}
        shareTargets={shareTargets}
        partnerId={partnerId}
        friendId={friendId}
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
