// Testseite für den Wiki-Graph: kleines Wiki mit Verlinkungen, einseitigen und gegenseitigen Verweisen, Unterseite, Einzelgänger.
import { createRoot } from "react-dom/client";
import { WikiGraph, type GraphPage } from "@/app/wiki/graph/wiki-graph";
import type { LinkEdge } from "@/lib/wiki-links";

const pages: GraphPage[] = [
  { id: "vamp", title: "Vampire", page_type: "spezies", tags: ["Untote"], lead: "Jäger der Nacht" },
  { id: "hafen", title: "Nebelhafen", page_type: "ort", tags: ["Küste"], lead: null },
  { id: "wolf", title: "Werwölfe", page_type: "spezies", tags: ["Untote"], lead: null },
  { id: "rat", title: "Der Rat", page_type: "organisation", tags: [], lead: null },
  { id: "sire", title: "Sireline", page_type: null, tags: [], lead: null },
  { id: "burg", title: "Alte Burg", page_type: "ort", tags: ["Küste"], lead: null },
  { id: "allein", title: "Einzelgänger", page_type: null, tags: [], lead: null },
];
const edges: LinkEdge[] = [
  { a: "vamp", b: "hafen", kind: "link", mutual: true },
  { a: "vamp", b: "wolf", kind: "link", mutual: false },
  { a: "rat", b: "vamp", kind: "link", mutual: false },
  { a: "vamp", b: "sire", kind: "child", mutual: false },
  { a: "hafen", b: "burg", kind: "link", mutual: false },
];
const focus = new URLSearchParams(location.search).get("fokus");
createRoot(document.getElementById("root")!).render(
  <div style={{ maxWidth: 1000, padding: 16 }}>
    <WikiGraph pages={pages} edges={edges} initialFocusId={focus} />
  </div>,
);
