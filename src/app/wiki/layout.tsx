import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiFolders, getWikiPageRows, getWikiTypes } from "@/lib/wiki-data";
import { WikiShell } from "./wiki-shell";
import { WikiTypesProvider } from "@/components/wiki-types-context";

export default async function WikiLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [folders, pages, types] = await Promise.all([getWikiFolders(world.id), getWikiPageRows(world.id), getWikiTypes(world.id)]);

  return (
    <WikiTypesProvider types={types}>
    <WikiShell
      worldId={world.id}
      worldName={world.name}
      folders={folders}
      pages={pages}
      userId={user.id}
      isWorldOwner={world.created_by === user.id}
    >
      {children}
    </WikiShell>
    </WikiTypesProvider>
  );
}
