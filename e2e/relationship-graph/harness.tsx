// Testseite für das Beziehungsnetz: 30 Figuren, ~45 Beziehungen mit Verlauf über 120 Tage, ohne Server und Datenbank.
import { createRoot } from "react-dom/client";
import { RelationshipGraph } from "@/app/characters/relationships/relationship-graph";
import type { Character, CharacterRelationship, RelationshipHistoryEntry } from "@/lib/types";

const N = 30;
const day = 86400000;
const now = Date.now();

const characters = Array.from({ length: N }, (_, i) => ({
  id: `c${i}`,
  name: `Figur ${i}`,
  avatar_url: null,
  house: i % 3 === 0 ? "Haus A" : i % 3 === 1 ? "Haus B" : null,
})) as unknown as Character[];

const relationships: CharacterRelationship[] = [];
const history: RelationshipHistoryEntry[] = [];
for (let i = 0; i < 45; i++) {
  const a = i % N;
  const b = (i * 7 + 3) % N;
  if (a === b) continue;
  const id = `r${i}`;
  const created = new Date(now - (120 - i * 2) * day).toISOString();
  relationships.push({
    id,
    world_id: "w",
    character_a_id: `c${a}`,
    character_b_id: `c${b}`,
    type: "Befreundet",
    color: "#5b9d6f",
    label: null,
    category: "freundschaft",
    family_role: null,
    created_by: "u",
    created_at: created,
  });
  history.push({ id: `h${i}`, relationship_id: id, type: "Befreundet", category: "freundschaft", color: "#5b9d6f", label: null, note: null, created_at: created });
}

createRoot(document.getElementById("root")!).render(
  <RelationshipGraph characters={characters} relationships={relationships} history={history} initialFocusId="c0" />,
);
