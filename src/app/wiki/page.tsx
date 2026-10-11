import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWorldAdminFlag } from "@/lib/world-admin";
import { defaultHome, parseWikiHome, visibleBlocks } from "@/lib/wiki-home";
import { HomeView } from "./home/home-view";
import { HomeEditorPage } from "./home/home-editor-page";

// „Wiki“: öffnet immer zuerst die Startseite der Welt (eigene Seite ohne Ordner); die Übersicht liegt unter /wiki/uebersicht
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
  // Immer zuerst die Startseite; solange keine eingerichtet ist, mit der Standard-Vorbelegung
  const shown = visibleBlocks(home).length > 0 ? home! : defaultHome();
  return <HomeView world={world} userId={user.id} home={shown} canEdit={canEdit} />;
}
