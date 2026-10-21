// Hochgeladene Dateien liegen immer unter einem neuen, zufälligen Pfad und ändern sich nie. Deshalb dürfen Browser und
// CDN sie ein Jahr lang behalten (Supabase-Vorgabe wäre 1 Stunde); das spart Datenverkehr im Free Plan.
export const UPLOAD_CACHE = { cacheControl: "31536000" } as const;
