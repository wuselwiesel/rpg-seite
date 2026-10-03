// Testseite für das Wiki-Formular (Typ-Wahl). Server-Aktionen und Uploads sind Platzhalter.
import { createRoot } from "react-dom/client";
import { WikiForm } from "@/app/wiki/wiki-form";

createRoot(document.getElementById("root")!).render(
  <div style={{ maxWidth: 800, padding: 16 }}>
    <WikiForm folders={[]} parentChoices={[]} linkTargets={[{ id: "a1", title: "Vampire" }]} />
  </div>,
);
