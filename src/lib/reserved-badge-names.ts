// Namen, die wie ein offizielles Siegel wirken: Nutzer:innen dürfen sie nicht für eigene Badges verwenden
// (das Konto-Siegel vergibt nur der Betreiber, siehe account_marks).
const RESERVED = /(verifizier|verified|offiziell|official|app[\s-]?bastler|wortwinkel|admin|moderator|betreiber|\bteam\b|\bstaff\b)/i;

export function isReservedBadgeName(name: string): boolean {
  return RESERVED.test(name.normalize("NFKD").replace(/[̀-ͯ]/g, ""));
}
