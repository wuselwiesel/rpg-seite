export type AppMode = "ingame" | "story";

// "Story-Modus" = die Autor:innen-Seite (Story schreiben, Wiki, Beziehungen).
// Alles andere ist "Ingame" (Feed, Chats, Charaktere - wie ein Social-Media-Profil).
export function getAppMode(pathname: string | null): AppMode {
  if (!pathname) return "ingame";
  if (/^\/(story|wiki)(\/|$)/.test(pathname)) return "story";
  if (/^\/characters\/relationships(\/|$)/.test(pathname)) return "story";
  return "ingame";
}
