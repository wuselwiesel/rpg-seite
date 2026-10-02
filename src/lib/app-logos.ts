export const LOGO_STORAGE_KEY = "wortwinkel:app-logo";

// Das Original ("tinte", schwarz-weiß) ist das Standard-Favicon; die anderen Farbvarianten wählt man in den Einstellungen.
export const DEFAULT_LOGO_ID = "tinte";

export const APP_LOGOS = [
  { id: "tinte", name: "Schwarz-Weiß (Original)" },
  { id: "rose", name: "Rosé" },
  { id: "kakao", name: "Kakao" },
  { id: "beere", name: "Beere" },
  { id: "daemmerblau", name: "Dämmerblau" },
  { id: "schiefer", name: "Schiefer" },
  { id: "lavendel", name: "Lavendel" },
  { id: "nebelflieder", name: "Nebelflieder" },
] as const;

export type AppLogoId = (typeof APP_LOGOS)[number]["id"];

export function isAppLogoId(value: string | null): value is AppLogoId {
  return APP_LOGOS.some((l) => l.id === value);
}

export function getStoredLogoId(): AppLogoId {
  try {
    const stored = localStorage.getItem(LOGO_STORAGE_KEY);
    return isAppLogoId(stored) ? stored : DEFAULT_LOGO_ID;
  } catch {
    return DEFAULT_LOGO_ID;
  }
}

// Setzt Tab-Icon (und Apple-Touch-Icon fürs "Zum Home-Bildschirm") auf das gewählte Logo.
// Das Original behält die helle/dunkle Variante; die installierte App (Manifest) bleibt beim Original.
// Weitere Icon-Links (Next legt eigene an) werden entfernt, sonst wählt der Browser unter mehreren aus.
const FAVICON_VERSION = "3";

export function applyAppLogo(id: AppLogoId, dark: boolean) {
  const href =
    id === DEFAULT_LOGO_ID
      ? dark
        ? `/icons/icon-dark-32.png?v=${FAVICON_VERSION}`
        : `/icon.png?v=${FAVICON_VERSION}`
      : `/icons/logos/${id}-64.png?v=${FAVICON_VERSION}`;

  let favicon = document.getElementById("favicon") as HTMLLinkElement | null;
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.id = "favicon";
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  favicon.type = "image/png";
  if (!favicon.href.endsWith(href)) favicon.href = href;
  document.head
    .querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="shortcut icon"]')
    .forEach((l) => l !== favicon && l.remove());

  document.head.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]').forEach((l, i) => {
    if (i > 0) l.remove();
  });
  let apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!apple) {
    apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    document.head.appendChild(apple);
  }
  apple.href = `/icons/logos/${id}-apple.png?v=${FAVICON_VERSION}`;
}

export function setStoredLogoId(id: AppLogoId) {
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, id);
  } catch {
    /* egal */
  }
  applyAppLogo(id, document.documentElement.classList.contains("dark"));
}
