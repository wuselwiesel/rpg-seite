// Konto-Namen (Benutzername und Anzeigename), die nach dem offiziellen Konto oder einem Siegel klingen: Sie sind dem Betreiber vorbehalten.
const RESERVED = /(wortwinkel|offiziell|official|verifiziert|verified|appbastler|moderator|betreiber|^admin|^support$|^team$|^staff$)/;

export function isReservedAccountName(name: string): boolean {
  const flat = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return RESERVED.test(flat);
}
