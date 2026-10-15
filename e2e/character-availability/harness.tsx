// Testseite für Verfügbarkeit und Ort eines Charakters (Besitzer:in und Ansicht für andere), ohne Server und Datenbank.
import { createRoot } from "react-dom/client";
import { AvailabilityBadge, AvailabilityControl } from "@/components/character-availability";

const q = new URLSearchParams(location.search);
const own = q.get("role") !== "other";
const availability = (q.get("a") || null) as "free" | "busy" | null;
const place = q.get("p") || null;

createRoot(document.getElementById("root")!).render(
  <div className="mx-auto max-w-2xl px-4 py-6">
    <h1 className="text-xl font-semibold text-fg">Lyra Nachtfeder</h1>
    {own ? <AvailabilityControl characterId="c1" availability={availability} location={place} /> : <AvailabilityBadge className="mt-3" availability={availability} location={place} />}
  </div>,
);
