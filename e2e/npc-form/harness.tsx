// Testseite für das Formular „Neuer Charakter“ mit NPC-Schalter und „Komplett würfeln“. Die Server-Aktion ist ein Platzhalter und sammelt das Abgeschickte.
import { createRoot } from "react-dom/client";
import { NewCharacterForm } from "@/app/characters/new/new-character-form";
import { EditCharacterForm } from "@/app/characters/[id]/edit/edit-character-form";
import type { Character } from "@/lib/types";

const params = new URLSearchParams(location.search);
(window as unknown as { __created: unknown[] }).__created = [];
const fateEnabled = params.get("schicksal") !== "aus";
const edit = { id: "c1", name: "Lyra", relationship_status: "beziehung", partner_character_id: null, best_friend_character_id: null, species: "mensch" } as unknown as Character;
createRoot(document.getElementById("root")!).render(
  params.get("edit") === "1" ? (
    <EditCharacterForm character={edit} mentionableCharacters={[]} fateEnabled={fateEnabled} />
  ) : (
  <NewCharacterForm
    takenNames={["anna", "ben", "lucian", "mia", "noah", "emilia", "felix", "greta", "hannah", "ida", "jonas", "klara", "luca"]}
    randomLists={params.get("eigene") ? { vorname: ["Zaphod"], nachname: ["Beeblebrox"] } : undefined}
    startAsNpc={params.get("npc") === "1"}
    choiceLists={params.get("wesen") === "aus" ? [{ id: "s", label: "Wesen", mode: "dropdown", isSpecies: true, disabled: true, options: [{ id: "1", label: "Elf" }] }] : undefined}
    fateEnabled={fateEnabled}
  />
  ),
);
