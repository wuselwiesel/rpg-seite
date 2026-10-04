import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { SettingsHeader } from "@/components/settings-back";
import { POOL_KINDS } from "@/lib/random-pools";
import { RandomListManager, type EntryRow } from "./random-list-manager";

export const metadata = { title: "Zufallslisten" };

export default async function RandomListsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const world = await getActiveWorld(user.id);
  if (!world) {
    return (
      <>
        <SettingsHeader title="Zufallslisten" />
        <p className="text-sm text-muted">
          <Link href="/worlds" className="text-accent hover:underline">
            Wähle zuerst eine Welt.
          </Link>
        </p>
      </>
    );
  }

  const { data } = await supabase
    .from("world_random_entries")
    .select("id, kind, text, created_by")
    .eq("world_id", world.id)
    .order("created_at", { ascending: false })
    .limit(POOL_KINDS.length * 500)
    .returns<EntryRow[]>();

  return (
    <>
      <SettingsHeader title="Zufallslisten" />
      <RandomListManager worldName={world.name} entries={data ?? []} currentUserId={user.id} isWorldOwner={world.created_by === user.id} />
    </>
  );
}
