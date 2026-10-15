// Welche Konto-Siegel in der App sichtbar sind: offizielles Wortwinkel-Konto, App-Bastler:in und bestätigte Konten (Hörnchen).
// Vergeben werden sie nur vom Betreiber (Tabelle account_marks); Markierungen wie „test“ oder „admin“ erscheinen nie.
export const VISIBLE_SEAL_KINDS = ["official", "builder", "verified"] as const;
export type VisibleSealKind = (typeof VISIBLE_SEAL_KINDS)[number];

export function isVisibleSeal(kind: string | null | undefined): kind is VisibleSealKind {
  return kind === "official" || kind === "builder" || kind === "verified";
}
