// Testseite: Schreibbereich einer Szene mit zwei eigenen Charakteren (Ayla mit Mut 15, Ben mit Mut 8+2); das Würfeln muss immer den Bogen des gewählten Charakters nutzen.
import { createRoot } from "react-dom/client";
import { StoryComposer } from "@/app/story/[id]/story-composer";
import type { Character } from "@/lib/types";

const mk = (id: string, name: string) => ({ id, owner_id: "u1", world_id: "w", name, avatar_url: null, bio: null, sheet_url: null }) as unknown as Character;
const own = [mk("a", "Ayla"), mk("b", "Ben")];

createRoot(document.getElementById("root")!).render(
  <div style={{ maxWidth: 560, padding: 16 }}>
    <StoryComposer
      storyPostId="s1"
      worldId="w"
      ownCharacters={own}
      activeCharacterId="a"
      characters={own}
      participantIds={["a", "b"]}
      calendar={{ months: [], weekdays: [] } as never}
      locations={[]}
      sceneLocation={null}
      userId="u1"
      worldMembers={[]}
    />
  </div>,
);
