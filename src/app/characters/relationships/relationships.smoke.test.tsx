import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { Character, CharacterRelationship } from "@/lib/types";

// Die Server-Aktionen werden hier nicht gebraucht: nur prüfen, dass die Oberfläche ohne Fehler aufgebaut wird.
vi.mock("../actions", () => ({
  createRelationship: vi.fn(),
  updateRelationship: vi.fn(),
  deleteRelationship: vi.fn(),
  getSharedScenes: vi.fn(),
  resolveRelationshipConflict: vi.fn(),
}));

import { RelationshipFields } from "./relationship-fields";
import { RelationshipList } from "./relationship-list";
import { RelationshipForm } from "./relationship-form";

const chars = ["a", "b", "c"].map((id, i) => ({ id: `${id}0000000-0000-4000-8000-00000000000${i}`, name: `Figur ${id}`, owner_id: "u1", avatar_url: null, house: null }) as unknown as Character);
const rel = {
  id: "r0000000-0000-4000-8000-000000000001",
  world_id: "w",
  character_a_id: chars[0].id,
  character_b_id: chars[1].id,
  type: "Befreundet",
  type_b: "Rivalin",
  color: "#5b9d6f",
  label: "seit der Schule",
  category: "freundschaft",
  family_role: null,
  is_secret: true,
  ended_on: "2026-01-02",
  ended_label: "war befreundet",
  created_by: "u1",
  created_at: "2026-01-01T00:00:00Z",
} as CharacterRelationship;

describe("Beziehungs-Oberfläche", () => {
  it("Felder: Anlegen und Ändern", () => {
    const create = renderToString(<RelationshipFields characters={chars} />);
    expect(create).toContain("Bezeichnung");
    expect(create).toContain("Geheim halten");
    const edit = renderToString(<RelationshipFields characters={chars} lockPair editing initial={rel} />);
    expect(edit).toContain("Beendet");
    expect(edit).toContain("war befreundet");
  });

  it("Liste zeigt gegenseitige Sicht, Ende, Geheimes und Widersprüche", () => {
    const html = renderToString(
      <RelationshipList
        relationships={[rel]}
        characters={chars}
        currentUserId="u1"
        isWorldOwner={false}
        conflicts={{ [rel.id]: [{ characterId: chars[0].id, characterName: "Figur a", label: "Mutter", expected: "Befreundet" }] }}
      />,
    );
    expect(html).toContain("sieht");
    expect(html).toContain("war befreundet");
    expect(html).toContain("Im ChaBo von");
    expect(html).toContain("Netz übernehmen");
    expect(html).toContain("Gemeinsame Szenen");
  });

  it("Formular ist erst zugeklappt", () => {
    expect(renderToString(<RelationshipForm characters={chars} />)).toContain("Beziehung hinzufügen");
  });
});
