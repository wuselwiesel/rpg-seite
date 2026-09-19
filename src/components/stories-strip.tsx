import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";

// Instagram-artige Leiste mit den Charakteren der Welt; führt zu den Profilen.
export async function StoriesStrip({ worldId, activeCharacterId }: { worldId: string; activeCharacterId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("characters")
    .select("*")
    .eq("world_id", worldId)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<Character[]>();

  const characters = [...(data ?? [])].sort(
    (a, b) => Number(b.id === activeCharacterId) - Number(a.id === activeCharacterId),
  );
  if (characters.length === 0) return null;

  return (
    <div className="-mx-4 mb-5 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {characters.map((character) => (
        <Link
          key={character.id}
          href={`/characters/${character.id}`}
          className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
          title={character.name}
        >
          <span className="rounded-full bg-gradient-to-tr from-accent to-accent-strong p-[2.5px]">
            <span className="block rounded-full bg-app p-[2px]">
              <CharacterAvatar name={character.name} avatarUrl={character.avatar_url} size={56} />
            </span>
          </span>
          <span className="w-full truncate text-center text-xs text-fg-soft">
            {character.id === activeCharacterId ? "Du" : character.name.split(" ")[0]}
          </span>
        </Link>
      ))}
    </div>
  );
}
