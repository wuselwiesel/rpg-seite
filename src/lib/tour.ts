// Startet den Rundgang von überall aus, ohne React-Context: AppTour (einmal im Layout gemountet)
// hört auf dieses Ereignis.
export const TOUR_START_EVENT = "wortwinkel:start-tour";

export function startTour() {
  window.dispatchEvent(new Event(TOUR_START_EVENT));
}
