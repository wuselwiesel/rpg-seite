import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWorldAdminFlag } from "@/lib/world-admin";
import { parseWikiHome } from "@/lib/wiki-home";
import { WikiOverview } from "../wiki-overview";

export default async function WikiOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");
  const canEditHome = await getWorldAdminFlag(user.id, world);
  return <WikiOverview canEditHome={canEditHome} hasHome={!!parseWikiHome(world.wiki_home)} />;
}
