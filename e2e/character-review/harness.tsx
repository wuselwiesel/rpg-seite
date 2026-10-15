// Testseite für die Prüf-Seite eines Charakters (Admin- und Besitzer:innen-Ansicht), ohne Server und Datenbank.
import { createRoot } from "react-dom/client";
import { ReviewPanel } from "@/app/characters/[id]/pruefung/review-panel";
import { listCharacterFields } from "@/lib/character-fields";
import { emptySheet } from "@/lib/sheet-rules";

const q = new URLSearchParams(location.search);
const role = q.get("role") ?? "admin";
const status = (q.get("status") ?? "pending") as "pending" | "approved" | "rejected";
const sheet = emptySheet();
sheet.notesBlocks = [{ label: "Notizen", html: "<p>Lang lebe die Königin</p>" }];
const fields = listCharacterFields(
  { name: "Lyra Nachtfeder", bio: "Eine sehr lange Kurzbeschreibung", house: null, quote: null, status_text: null, gender: "weiblich", choices: {} },
  [],
  sheet,
);
const proposals = [
  { id: "p1", label: "Name", oldValue: "Lyra", newValue: "Lyra Nachtfeder-Hohenzollern der Zweiten von Irgendwo", note: "Passt besser zur Welt", byName: "Mira", status: "open" as const },
  { id: "p2", label: "Zitat", oldValue: "", newValue: "Hallo", note: "", byName: "Mira", status: "accepted" as const },
];

createRoot(document.getElementById("root")!).render(
  <div className="mx-auto max-w-2xl px-4 py-6">
    <ReviewPanel characterId="c1" status={status} reviewNote={status === "rejected" ? "Bitte Hintergrund ergänzen" : null} isAdmin={role === "admin"} isOwner={role === "owner"} fields={fields} proposals={proposals} />
  </div>,
);
