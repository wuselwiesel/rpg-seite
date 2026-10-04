// Verwaltung der eigenen Zufallslisten (Einstellungen): Reiter, mehrere Einträge auf einmal, Löschen nur für Eigene bzw. Welt-Besitzerin.
import { createRoot } from "react-dom/client";
import { RandomListManager, type EntryRow } from "@/app/profile/zufallslisten/random-list-manager";

const entries: EntryRow[] = [
  { id: "1", kind: "vorname", text: "Zaphod", created_by: "me" },
  { id: "2", kind: "vorname", text: "Trillian", created_by: "other" },
  { id: "3", kind: "hobby", text: "Angeln am Fluss, auch bei sehr schlechtem Wetter und mitten in der Nacht", created_by: "me" },
];
const owner = new URLSearchParams(location.search).get("owner") === "1";

createRoot(document.getElementById("root")!).render(
  <div className="mx-auto max-w-2xl p-4">
    <RandomListManager worldName="Pinewood" entries={entries} currentUserId="me" isWorldOwner={owner} />
  </div>,
);
