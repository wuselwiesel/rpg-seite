// Testseite für das Merken des Modus: der Pfad lässt sich per window.__setPath ändern (Platzhalter für next/navigation).
import { createRoot } from "react-dom/client";
import { ModeProvider, useAppMode } from "@/components/mode-context";
import { parseRememberedMode } from "@/lib/app-mode";

function Probe() {
  const mode = useAppMode();
  return <p data-testid="mode">{mode}</p>;
}
const initial = parseRememberedMode(new URLSearchParams(location.search).get("start"));
createRoot(document.getElementById("root")!).render(
  <ModeProvider initial={initial}>
    <Probe />
  </ModeProvider>,
);
