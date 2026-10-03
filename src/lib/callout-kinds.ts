// Arten des Hinweis-Kastens (gleiche Liste wie in sanitize-core.ts; hier ohne sanitize-html, damit der Client sie importieren kann).
export const CALLOUT_KINDS = ["info", "tipp", "achtung", "gefahr"] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];
