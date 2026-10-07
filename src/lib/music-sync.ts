// Gemeinsames Hören: Wer teilt (Host), schickt Position und Pause-Zustand; wer mithört, springt bei zu großem Abstand an dieselbe Stelle.
// Reine Entscheidungsfunktion, damit sie sich testen lässt.
export type HostState = { position: number; paused: boolean };
export type LocalState = { position: number; paused: boolean; duration: number };
export type SyncAction =
  | { type: "none" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "seek"; seconds: number; resume: boolean }
  | { type: "preview-only" };

// Ab diesem Abstand (ms) wird gesprungen; darunter läuft es einfach weiter.
export const DRIFT_LIMIT_MS = 2500;
// Wie lange die Nachricht unterwegs war und die Anzeige braucht (ms), grob
export const LATENCY_MS = 300;

export function decideSync(host: HostState, local: LocalState): SyncAction {
  if (host.paused) return local.paused ? { type: "none" } : { type: "pause" };
  const target = host.position + LATENCY_MS;
  // Die Vorschau (ohne Spotify-Anmeldung) ist nur etwa 30 Sekunden lang: dahinter kann man nicht mithören
  if (local.duration > 0 && target >= local.duration - 500) return { type: "preview-only" };
  if (local.paused) return { type: "seek", seconds: target / 1000, resume: true };
  return Math.abs(local.position - target) > DRIFT_LIMIT_MS ? { type: "seek", seconds: target / 1000, resume: false } : { type: "none" };
}
