import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CharacterAvatar } from "./character-avatar";
import { ScrollRow } from "./scroll-row";
import { StoryLauncher, type StoryGroup } from "./story-viewer";
import type { Character, Story } from "@/lib/types";

// Instagram-artige Leiste: Charaktere mit aktiver Story öffnen sie im Viewer,
// alle anderen führen zum Profil. Der eigene aktive Charakter steht vorn.
export async function StoriesStrip({ worldId, activeCharacterId }: { worldId: string; activeCharacterId: string }) {
  const supabase = await createClient();
  const [{ data }, { data: storyRows }] = await Promise.all([
    supabase
      .from("characters")
      .select("*")
      .eq("world_id", worldId)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<Character[]>(),
    supabase
      .from("stories")
      .select("*, characters!stories_character_id_fkey!inner(world_id)")
      .eq("characters.world_id", worldId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .returns<(Story & { characters: { world_id: string } })[]>(),
  ]);

  const storiesByCharacter = new Map<string, Story[]>();
  for (const s of storyRows ?? []) {
    const list = storiesByCharacter.get(s.character_id) ?? [];
    list.push(s);
    storiesByCharacter.set(s.character_id, list);
  }

  // Nur Charaktere mit aktiver Story (wie bei Instagram) – der aktive Charakter steht immer vorn,
  // damit man selbst eine Story erstellen kann.
  const characters = (data ?? [])
    .filter((c) => c.id === activeCharacterId || storiesByCharacter.has(c.id))
    .sort((a, b) => Number(b.id === activeCharacterId) - Number(a.id === activeCharacterId));
  if (characters.length === 0) return null;

  const withStories = characters.filter((c) => storiesByCharacter.has(c.id));
  const groups: StoryGroup[] = withStories.map((c) => ({
    key: c.id,
    characterId: c.id,
    characterName: c.name,
    avatarUrl: c.avatar_url,
    stories: storiesByCharacter.get(c.id)!,
    canManage: c.id === activeCharacterId,
  }));

  return (
    <div className="mb-2 pr-11">
      <ScrollRow className="pb-0.5">
        {characters.map((character) => {
          const isActive = character.id === activeCharacterId;
          const groupIndex = withStories.findIndex((c) => c.id === character.id);
          const avatar = <CharacterAvatar name={character.name} avatarUrl={character.avatar_url} size={52} />;
          const caption = (
            <span className="w-full truncate text-center text-xs text-fg-soft">
              {isActive ? "Deine Story" : character.name.split(" ")[0]}
            </span>
          );

          return (
            <div key={character.id} className="relative flex w-[64px] shrink-0 flex-col items-center gap-1">
              {groupIndex >= 0 ? (
                <StoryLauncher
                  groups={groups}
                  startIndex={groupIndex}
                  ringWidth={2.5}
                  viewerCharacterId={activeCharacterId}
                  label={`Story von ${character.name} ansehen`}
                  className="flex w-full flex-col items-center gap-1"
                >
                  {avatar}
                </StoryLauncher>
              ) : (
                <Link
                  href={isActive ? "/stories/new" : `/characters/${character.id}`}
                  title={character.name}
                  className="flex flex-col items-center"
                >
                  <span className="block rounded-full bg-line p-[2.5px]">
                    <span className="block rounded-full bg-app p-[2px]">{avatar}</span>
                  </span>
                </Link>
              )}
              {caption}
              {isActive && (
                <Link
                  href="/stories/new"
                  aria-label="Neue Story erstellen"
                  className="absolute right-0 top-[34px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-app bg-accent-strong text-on-accent-strong"
                >
                  <Plus className="h-3 w-3" strokeWidth={3} />
                </Link>
              )}
            </div>
          );
        })}
      </ScrollRow>
    </div>
  );
}
