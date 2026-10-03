// Testseite für den Karten-Betrachter. Server-Aktionen sind Platzhalter, die ihre Aufrufe in window.__calls sammeln.
import { createRoot } from "react-dom/client";
import { MapViewer } from "@/app/wiki/karten/[id]/map-viewer";
import type { WikiMap, WikiMapPin } from "@/lib/wiki-map";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#9cc"/><circle cx="400" cy="250" r="120" fill="#6a6"/></svg>`;
const map: WikiMap = {
  id: "m1",
  world_id: "w",
  title: "Weltkarte",
  description: null,
  image_url: "data:image/svg+xml;utf8," + encodeURIComponent(svg),
  created_by: "u",
  created_at: "",
  updated_at: "",
};
const pins: WikiMapPin[] = [
  { id: "p1", map_id: "m1", x: 25, y: 40, label: "Nebelhafen", icon: null, page_id: "pg1", target_map_id: null },
  { id: "p2", map_id: "m1", x: 75, y: 70, label: "Alte Burg", icon: "🏰", page_id: null, target_map_id: "m2" },
];

(window as unknown as { __calls: unknown[] }).__calls = [];
createRoot(document.getElementById("root")!).render(
  <div style={{ maxWidth: 900, padding: 16 }}>
    <MapViewer
      map={map}
      initialPins={pins}
      pages={[
        { id: "pg1", title: "Nebelhafen (Seite)" },
        { id: "pg2", title: "Vampire" },
      ]}
      otherMaps={[{ id: "m2", title: "Burgkarte" }]}
    />
  </div>,
);
