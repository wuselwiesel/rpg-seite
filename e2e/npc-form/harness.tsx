// Testseite für das Formular „Neuer Charakter“ mit NPC-Schalter und „Komplett würfeln“. Die Server-Aktion ist ein Platzhalter und sammelt das Abgeschickte.
import { createRoot } from "react-dom/client";
import { NewCharacterForm } from "@/app/characters/new/new-character-form";

const params = new URLSearchParams(location.search);
(window as unknown as { __created: unknown[] }).__created = [];
createRoot(document.getElementById("root")!).render(
  <NewCharacterForm
    takenNames={["anna", "ben", "lucian", "mia", "noah", "emilia", "felix", "greta", "hannah", "ida", "jonas", "klara", "luca"]}
    randomLists={params.get("eigene") ? { vorname: ["Zaphod"], nachname: ["Beeblebrox"] } : undefined}
    startAsNpc={params.get("npc") === "1"}
    choiceLists={params.get("wesen") === "aus" ? [{ id: "s", label: "Wesen", mode: "dropdown", isSpecies: true, disabled: true, options: [{ id: "1", label: "Elf" }] }] : undefined}
  />,
);
