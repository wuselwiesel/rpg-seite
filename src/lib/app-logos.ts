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
// Next legt eigene Icon-Links an, die React verwaltet - sie dürfen nicht entfernt werden (sonst bricht die
// Hydration ab). Deshalb zeigen ALLE Icon-Links auf dasselbe Bild, nur das href wird geändert.
const FAVICON_VERSION = "3";

function setHref(link: HTMLLinkElement, href: string) {
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
}

export function applyAppLogo(id: AppLogoId, dark: boolean) {
  const href =
    id === DEFAULT_LOGO_ID
      ? dark
        ? `/icons/icon-dark-32.png?v=${FAVICON_VERSION}`
        : `/icon.png?v=${FAVICON_VERSION}`
      : `/icons/logos/${id}-64.png?v=${FAVICON_VERSION}`;

  let found = false;
  document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="shortcut icon"]').forEach((l) => {
    found = true;
    setHref(l, href);
    l.setAttribute("type", "image/png");
    l.removeAttribute("sizes");
  });
  if (!found) {
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/png";
    favicon.href = href;
    document.head.appendChild(favicon);
  }

  const appleHref = `/icons/logos/${id}-apple.png?v=${FAVICON_VERSION}`;
  const apples = document.head.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (apples.length) apples.forEach((l) => setHref(l, appleHref));
  else {
    const apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    apple.href = appleHref;
    document.head.appendChild(apple);
  }
}

export function setStoredLogoId(id: AppLogoId) {
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, id);
  } catch {
    /* egal */
  }
  applyAppLogo(id, document.documentElement.classList.contains("dark"));
}
