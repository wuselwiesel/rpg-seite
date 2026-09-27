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

  // Für jede Welt: Besitzer:innen-Liste (Profil-Filter) UND die vollständige Charakterliste
  // (für "Bestimmter Charakter" bei Charakter 1 - auch Charaktere anderer Accounts/Welten wählbar).
  const perWorld = await Promise.all(
    worlds.map(async (world) => {
      const mentionable = await getMentionableCharacters(user.id, world.id);
      const ownerIds = Array.from(new Set(mentionable.map((c) => c.owner_id)));
      const owners = ownerIds.map((id) => ({
        ownerId: id,
        label: id === user.id ? "Ich" : (friendLabel.get(id) ?? "Unbekannt"),
      }));
      const characters = mentionable.map((c) => ({
        id: c.id,
        name: c.name,
        ownerId: c.owner_id,
        ownerLabel: c.owner_id === user.id ? "Ich" : (friendLabel.get(c.owner_id) ?? "Unbekannt"),
      }));
      return { world: { id: world.id, name: world.name, owners }, characters };
    }),
  );
  const worldOptions: WorldOption[] = perWorld.map((p) => p.world);
  const allCharacterOptions = perWorld
    .filter((p) => p.characters.length > 0)
    .map((p) => ({ worldId: p.world.id, worldName: p.world.name, characters: p.characters }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Schicksalswürfel</h1>
      <p className="mb-6 text-sm text-muted">
        Würfle ein einschneidendes Schicksal für einen deiner Charaktere und poste es als neue Szene in der Story.
      </p>
      <SchicksalForm
        ownCharacters={ownCharacters}
        worldOptions={worldOptions}
        allCharacterOptions={allCharacterOptions}
        activeWorldId={activeWorld.id}
      />
    </div>
  );
}
