import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWorldAdminFlag } from "@/lib/world-admin";
import { parseWikiHome, visibleBlocks } from "@/lib/wiki-home";
import { WikiOverview } from "./wiki-overview";
import { HomeView } from "./home/home-view";
import { HomeEditorPage } from "./home/home-editor-page";

// „Wiki“: erst die selbst eingerichtete Startseite der Welt, sonst die automatische Übersicht
export default async function WikiHomePage({ searchParams }: PageProps<"/wiki">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const home = parseWikiHome(world.wiki_home);
  const canEdit = await getWorldAdminFlag(user.id, world);
  if (canEdit && sp.bearbeiten) return <HomeEditorPage worldId={world.id} home={home} />;
  if (visibleBlocks(home).length > 0) return <HomeView world={world} userId={user.id} home={home!} canEdit={canEdit} />;
  return <WikiOverview canEditHome={canEdit} hasHome={!!home} />;
}
