export type AppMode = "ingame" | "story" | "redaktion";

// Name des Cookies, in dem der zuletzt benutzte Modus (ingame oder story) steht (Sitzungs-Cookie, vom Browser gesetzt).
export const MODE_COOKIE = "ww_mode";

export function parseRememberedMode(raw: string | null | undefined): Exclude<AppMode, "redaktion"> {
  return raw === "story" ? "story" : "ingame";
}

// Seiten, die zu keinem Bereich gehören und den Modus übernehmen, in dem man gerade ist: Charakterprofile samt Unterseiten
// (Folgen, Bearbeiten, Highlights, ChaBo) und die Welt-Seite mit allem dahinter (Wiki, Beziehungen, Würfelverlauf,
// Charakterliste). So bleibt man aus dem Ingame über „Welt › Wiki“ im Ingame und aus der Story in der Story.
export function isNeutralPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (/^\/(welt|wiki)(\/|$)/.test(pathname)) return true;
  if (/^\/story\/(wuerfe|charaktere)(\/|$)/.test(pathname)) return true;
  const m = /^\/characters\/([^/]+)/.exec(pathname);
  if (!m) return false;
  return m[1] !== "new";
}

// "Story-Modus" = die Autor:innen-Seite (Szenen schreiben, Hilfe, Ausschnitte).
// "Redaktion" = der welt-/charakterunabhängige Account-Bereich - zählt bewusst nicht als
// "Ingame", damit der Modus-Schalter dort keinen der beiden Reiter aktiv zeigt.
// Alles andere ist "Ingame" (Feed, Chats, Charakterliste). Charakterprofile und die Welt-Seiten übernehmen den zuletzt
// benutzten Modus (`remembered`).
export function getAppMode(pathname: string | null, remembered: Exclude<AppMode, "redaktion"> = "ingame"): AppMode {
  if (!pathname) return "ingame";
  if (/^\/redaktion(\/|$)/.test(pathname)) return "redaktion";
  if (isNeutralPath(pathname)) return remembered;
  if (/^\/story(\/|$)/.test(pathname)) return "story";
  // Hilfe und Ausschnitte gehören zum Schreiben
  if (/^\/(hilfe|ausschnitte)(\/|$)/.test(pathname)) return "story";
  return "ingame";
}
