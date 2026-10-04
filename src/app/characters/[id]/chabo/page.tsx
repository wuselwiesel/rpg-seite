import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCharacterSheet } from "@/lib/character-sheet-data";
import { getMentionableCharacters, getOwnCharacters, getOwnNpcs, getWorldNpcs } from "@/lib/active-character";
import { getCharacterAccess } from "@/lib/npc-data";
import { NpcBadge } from "@/components/npc-badge";
import { ChaboSwitcher } from "@/components/chabo/chabo-switcher";
import { Chabo } from "@/components/chabo/chabo";

export const metadata = { title: "Charakterbogen" };

export default async function ChaboPage({ params }: PageProps<"/characters/[id]/chabo">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: character } = await supabase
    .from("characters")
    .select("id, name, owner_id, world_id, sheet_url, is_npc")
    .eq("id", id)
    .maybeSingle<{ id: string; name: string; owner_id: string; world_id: string; sheet_url: string | null; is_npc: boolean }>();
  if (!character) notFound();

  // Bearbeiten und Geheimes: Besitzer:in, bei NPCs auch die Welt-Besitzerin
  const isOwn = (await getCharacterAccess(character, user.id)).canEdit;
  const [sheet, mentionCharacters, ownChars, ownNpcs, worldNpcs] = await Promise.all([
    getCharacterSheet(id, isOwn),
    getMentionableCharacters(user.id, character.world_id),
    getOwnCharacters(user.id, character.world_id),
    getOwnNpcs(user.id, character.world_id),
    getWorldNpcs(character.world_id),
  ]);
  if (!isOwn && !sheet) notFound();
  // ChaBo-Wechsler: eigene Charaktere, darunter getrennt die NPCs (eigene zuerst, dann die übrigen der Welt)
  const ownNpcIds = new Set(ownNpcs.map((n) => n.id));
  const switcherNpcs = [...ownNpcs, ...worldNpcs.filter((n) => !ownNpcIds.has(n.id))];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/characters/${id}`} className="flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          Zum Profil
        </Link>
        <div className="flex items-center gap-2">
          {character.is_npc && <NpcBadge />}
          <ChaboSwitcher currentId={id} characters={ownChars.map((c) => ({ id: c.id, name: c.name }))} npcs={switcherNpcs.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </div>
      <Chabo key={id} characterId={id} characterName={character.name} initial={sheet} editable={isOwn} legacyUrl={isOwn ? character.sheet_url : null} mentionCharacters={mentionCharacters} />
    </div>
  );
}
