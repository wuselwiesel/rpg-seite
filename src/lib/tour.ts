// Startet Rundgänge von überall aus, ohne React-Context: AppTour (einmal im Layout gemountet) hört auf dieses Ereignis.
export const TOUR_START_EVENT = "wortwinkel:start-tour";

// Mit id startet genau dieser Rundgang, ohne id öffnet sich die Auswahl aller Rundgänge.
export function startTour(id?: string) {
  window.dispatchEvent(new CustomEvent(TOUR_START_EVENT, { detail: { id: id ?? null } }));
}

// Merkt, welche Rundgänge schon bis zum Ende gesehen wurden (nur auf diesem Gerät).
export const TOURS_DONE_KEY = "wortwinkel:tours-done";

export function readToursDone(): string[] {
  try {
    const raw = localStorage.getItem(TOURS_DONE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function markTourDone(id: string): string[] {
  const done = Array.from(new Set([...readToursDone(), id]));
  try {
    localStorage.setItem(TOURS_DONE_KEY, JSON.stringify(done));
  } catch {
    /* egal */
  }
  return done;
}
