// Testseite für die Wiki-Seitenleiste: kleiner Baum, Server-Aktionen sind Platzhalter, die ihre Aufrufe in window.__moves sammeln.
import { createRoot } from "react-dom/client";
import { WikiShell } from "@/app/wiki/wiki-shell";
import type { FolderRow, PageRow } from "@/lib/wiki-tree";

const folders: FolderRow[] = [
  { id: "00000000-0000-4000-8000-0000000000f1", parent_id: null, name: "Orte", created_by: "u" },
  { id: "00000000-0000-4000-8000-0000000000f2", parent_id: "00000000-0000-4000-8000-0000000000f1", name: "Städte", created_by: "u" },
  { id: "00000000-0000-4000-8000-0000000000f4", parent_id: null, name: "NPCs", created_by: "u" },
];
const F = { orte: folders[0].id, staedte: folders[1].id, npcs: folders[2].id };
const pages: PageRow[] = [
  { id: "00000000-0000-4000-8000-0000000000a1", title: "Nebelhafen", folder_id: F.staedte, parent_page_id: null },
  { id: "00000000-0000-4000-8000-0000000000a2", title: "Hafenviertel", folder_id: F.staedte, parent_page_id: "00000000-0000-4000-8000-0000000000a1" },
  { id: "00000000-0000-4000-8000-0000000000a4", title: "Lose Seite", folder_id: null, parent_page_id: null },
  { id: "00000000-0000-4000-8000-0000000000a5", title: "Elfen", folder_id: F.npcs, parent_page_id: null },
];

(window as unknown as { __moves: unknown[] }).__moves = [];
createRoot(document.getElementById("root")!).render(
  <WikiShell worldId="w" worldName="Testwelt" folders={folders} pages={pages} userId="u" isWorldOwner>
    <p>Inhalt</p>
  </WikiShell>,
);
