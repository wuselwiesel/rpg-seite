export const LOGO_STORAGE_KEY = "wortwinkel:app-logo";

// Das Original ("rose") ist das Standard-Favicon; die anderen Farbvarianten wählt man in den Einstellungen.
export const DEFAULT_LOGO_ID = "rose";

export const APP_LOGOS = [
  { id: "rose", name: "Rosé (Original)" },
  { id: "kakao", name: "Kakao" },
  { id: "beere", name: "Beere" },
  { id: "daemmerblau", name: "Dämmerblau" },
  { id: "schiefer", name: "Schiefer" },
  { id: "tinte", name: "Tinte" },
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
export function applyAppLogo(id: AppLogoId, dark: boolean) {
  const favicon = document.getElementById("favicon") as HTMLLinkElement | null;
  if (favicon) {
    favicon.href = id === DEFAULT_LOGO_ID ? (dark ? "/icons/icon-dark-32.png" : "/icon.png") : `/icons/logos/${id}-64.png`;
  }
  let apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!apple) {
    apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    document.head.appendChild(apple);
  }
  apple.href = `/icons/logos/${id}-apple.png`;
}

export function setStoredLogoId(id: AppLogoId) {
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, id);
  } catch {
    /* egal */
  }
  applyAppLogo(id, document.documentElement.classList.contains("dark"));
}
