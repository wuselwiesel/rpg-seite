import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMentionableCharacters, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld, getUserWorlds } from "@/lib/worlds";
import { getAcceptedFriends } from "@/lib/friends";
import { SchicksalForm, type WorldOption } from "./schicksal-form";

export default async function SchicksalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const [ownCharacters, worlds, friends] = await Promise.all([
    getOwnCharacters(user.id, activeWorld.id),
    getUserWorlds(user.id),
    getAcceptedFriends(user.id),
  ]);
  if (ownCharacters.length === 0) redirect("/characters/new");

  const friendLabel = new Map(friends.map((f) => [f.id, f.nickname ?? f.username]));

  const worldOptions: WorldOption[] = await Promise.all(
    worlds.map(async (world) => {
      const mentionable = await getMentionableCharacters(user.id, world.id);
      const ownerIds = Array.from(new Set(mentionable.map((c) => c.owner_id)));
      const owners = ownerIds.map((id) => ({
        ownerId: id,
        label: id === user.id ? "Ich" : (friendLabel.get(id) ?? "Unbekannt"),
      }));
      return { id: world.id, name: world.name, owners };
    }),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Schicksalswürfel</h1>
      <p className="mb-6 text-sm text-muted">
        Würfle ein einschneidendes Schicksal für einen deiner Charaktere und poste es als neue Szene in der Story.
      </p>
      <SchicksalForm ownCharacters={ownCharacters} worldOptions={worldOptions} activeWorldId={activeWorld.id} />
    </div>
  );
}
