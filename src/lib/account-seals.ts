// Welche Konto-Siegel in der App sichtbar sind: nur das der Betreiberin (App-Bastler:in) und das offizielle Wortwinkel-Konto.
// Andere Markierungen (z. B. „verified“) bleiben in der Datenbank, werden aber nicht angezeigt.
export const VISIBLE_SEAL_KINDS = ["official", "builder"] as const;
export type VisibleSealKind = (typeof VISIBLE_SEAL_KINDS)[number];

export function isVisibleSeal(kind: string | null | undefined): kind is VisibleSealKind {
  return kind === "official" || kind === "builder";
}
