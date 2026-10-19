import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMentionableCharacters } from "@/lib/active-character";
import { getCharacterAccess } from "@/lib/npc-data";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { getWorldFateEnabled, getWorldHouseEnabled } from "@/lib/world-dice";
import { NpcToggle } from "@/components/npc-toggle";
import { ClaimableToggle } from "@/components/claimable-toggle";
import { ReleaseCharacterButton } from "@/components/release-character-button";
import type { Character } from "@/lib/types";
import { EditCharacterForm } from "./edit-character-form";
import { DeleteCharacterButton } from "./delete-character-button";

export default async function EditCharacterPage({
  params,
}: PageProps<"/characters/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: character } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .maybeSingle<Character>();

  if (!character) notFound();
  // Bearbeiten: Besitzer:in, bei NPCs auch die Welt-Besitzerin; umwandeln nur die Anleger:in
  const access = await getCharacterAccess(character, user.id);
  if (!access.canEdit) redirect(`/characters/${id}`);

  // Für Partner:in / beste:r Freund:in: eigene + Freundes-Charaktere derselben Welt, ohne sich selbst.
  const mentionable = (await getMentionableCharacters(user.id, character.world_id)).filter((c) => c.id !== character.id);
  const choiceLists = await getWorldChoiceLists(character.world_id, true);
  const fateEnabled = await getWorldFateEnabled(character.world_id);
  const houseEnabled = await getWorldHouseEnabled(character.world_id);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 font-serif text-3xl text-fg">Charakter bearbeiten</h1>
      {access.canToggle && (
        <div className="mb-5">
          <NpcToggle characterId={character.id} initial={Boolean(character.is_npc)} />
        </div>
      )}
      {!character.vacant && ((character.is_npc && (access.canToggle || access.canOffer)) || (!character.is_npc && access.canToggle)) && (
        <div className="mb-5">
          <ClaimableToggle characterId={character.id} initial={Boolean(character.claimable)} />
        </div>
      )}
      <EditCharacterForm character={character} mentionableCharacters={mentionable} choiceLists={choiceLists} fateEnabled={fateEnabled} houseEnabled={houseEnabled} />

      {access.canToggle && !character.is_npc && !access.isWorldOwner && (
        <div className="mt-8 border-t border-line pt-6">
          <ReleaseCharacterButton characterId={character.id} characterName={character.name} />
        </div>
      )}

      <div className="mt-8 border-t border-line pt-6">
        <p className="mb-3 text-sm text-muted">
          Das Löschen entfernt auch alle Beiträge, Kommentare und Story-Einträge dieses Charakters –
          unwiderruflich.
        </p>
        <DeleteCharacterButton characterId={character.id} characterName={character.name} />
      </div>
    </div>
  );
}
