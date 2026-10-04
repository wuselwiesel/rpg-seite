export type AppMode = "ingame" | "story" | "redaktion";

// "Story-Modus" = die Autor:innen-Seite (Story schreiben, Wiki, Beziehungen).
// "Redaktion" = der welt-/charakterunabhängige Account-Bereich - zählt bewusst nicht als
// "Ingame", damit der Modus-Schalter dort keinen der beiden Reiter aktiv zeigt.
// Alles andere ist "Ingame" (Feed, Chats, Charaktere - wie ein Social-Media-Profil).
export function getAppMode(pathname: string | null): AppMode {
  if (!pathname) return "ingame";
  if (/^\/redaktion(\/|$)/.test(pathname)) return "redaktion";
  if (/^\/(story|wiki)(\/|$)/.test(pathname)) return "story";
  if (/^\/characters\/relationships(\/|$)/.test(pathname)) return "story";
  // ChaBo (Charakterbogen) und Hilfe gehören zum Spielen und Schreiben
  if (/^\/characters\/[^/]+\/chabo(\/|$)/.test(pathname) || /^\/hilfe(\/|$)/.test(pathname)) return "story";
  return "ingame";
}
