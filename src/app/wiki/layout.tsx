import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld, getUserWorlds } from "@/lib/worlds";
import { getWikiFolders, getWikiPageRows, getWikiTypes } from "@/lib/wiki-data";
import { getWorldAdminIds } from "@/lib/npc-data";
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

  const [adminIds, folders, pages, types, worlds] = await Promise.all([
    getWorldAdminIds(world.id),
    getWikiFolders(world.id),
    getWikiPageRows(world.id),
    getWikiTypes(world.id),
    getUserWorlds(user.id),
  ]);

  // Offene Rollenanfragen: nur Admins sehen sie, als Zahl am Reiter „Besetzung“
  const isAdmin = adminIds.includes(user.id);
  const { count: castRequests } =
    isAdmin && world.cast_enabled
      ? await supabase.from("world_role_requests").select("id", { count: "exact", head: true }).eq("world_id", world.id).eq("status", "pending")
      : { count: 0 };

  return (
    <WikiTypesProvider types={types}>
    <WikiShell
      worldId={world.id}
      worldName={world.name}
      worlds={worlds.map((w) => ({ id: w.id, name: w.name }))}
      folders={folders}
      pages={pages}
      userId={user.id}
      isWorldOwner={world.created_by === user.id}
      showCast={Boolean(world.cast_enabled) || isAdmin}
      castRequests={castRequests ?? 0}
    >
      {children}
    </WikiShell>
    </WikiTypesProvider>
  );
}
