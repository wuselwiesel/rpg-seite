// Testseite für den ChaBo im Bearbeiten (Würfeln, Rückgängig). Speichern und Bild-Upload sind Platzhalter; Speichern-Aufrufe landen in window.__saves.
import { createRoot } from "react-dom/client";
import { Chabo } from "@/components/chabo/chabo";
import { applyRace, emptySheet } from "@/lib/sheet-rules";

const params = new URLSearchParams(location.search);
let initial = null;
if (params.get("gefuellt")) {
  initial = emptySheet();
  initial.attrBasis = { MU: "12", IG: "11", GE: "9", KO: "8", IN: "10", KK: "7", FF: "6", CH: "9", SB: "8", GL: "10" };
  initial.talentBonus = { klettern: "5", singen: "7" };
  initial.personalFields = [{ label: "Vorname", value: "Lyra" }];
  if (params.get("vampir")) initial = applyRace(initial, "vampir");
}
(window as unknown as { __saves: unknown[] }).__saves = [];
createRoot(document.getElementById("root")!).render(
  <div style={{ maxWidth: 1000, padding: params.get("schmal") ? 8 : 16 }}>
    <Chabo characterId="c1" characterName="Lyra Nachtfeder" initial={initial} editable />
  </div>,
);
