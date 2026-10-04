export type AppMode = "ingame" | "story" | "redaktion";

// Name des Cookies, in dem der zuletzt benutzte Modus (ingame oder story) steht (Sitzungs-Cookie, vom Browser gesetzt).
export const MODE_COOKIE = "ww_mode";

export function parseRememberedMode(raw: string | null | undefined): Exclude<AppMode, "redaktion"> {
  return raw === "story" ? "story" : "ingame";
}

// Seiten, die zu keinem Bereich gehören und den Modus übernehmen, in dem man gerade ist: Charakterprofile samt Unterseiten
// (Folgen, Bearbeiten, Highlights). So bleibt man mit „Profil“ in der Story in der Story.
export function isNeutralPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const m = /^\/characters\/([^/]+)(\/([^/]+))?/.exec(pathname);
  if (!m) return false;
  if (m[1] === "relationships" || m[1] === "new") return false;
  return m[3] !== "chabo";
}

// "Story-Modus" = die Autor:innen-Seite (Story schreiben, Wiki, Beziehungen, ChaBo).
// "Redaktion" = der welt-/charakterunabhängige Account-Bereich - zählt bewusst nicht als
// "Ingame", damit der Modus-Schalter dort keinen der beiden Reiter aktiv zeigt.
// Alles andere ist "Ingame" (Feed, Chats, Charakterliste). Charakterprofile übernehmen den zuletzt benutzten Modus (`remembered`).
export function getAppMode(pathname: string | null, remembered: Exclude<AppMode, "redaktion"> = "ingame"): AppMode {
  if (!pathname) return "ingame";
  if (/^\/redaktion(\/|$)/.test(pathname)) return "redaktion";
  if (/^\/(story|wiki)(\/|$)/.test(pathname)) return "story";
  if (/^\/characters\/relationships(\/|$)/.test(pathname)) return "story";
  // ChaBo (Charakterbogen) und Hilfe gehören zum Spielen und Schreiben
  if (/^\/characters\/[^/]+\/chabo(\/|$)/.test(pathname) || /^\/hilfe(\/|$)/.test(pathname)) return "story";
  if (isNeutralPath(pathname)) return remembered;
  return "ingame";
}
