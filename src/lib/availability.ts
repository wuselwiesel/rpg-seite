// Verfügbarkeit und Aufenthaltsort eines Charakters (für alle in der Welt sichtbar).
export type Availability = "free" | "busy";

export const AVAILABILITY_LABEL: Record<Availability, string> = { free: "Verfügbar", busy: "Beschäftigt" };

export function parseAvailability(raw: unknown): Availability | null {
  return raw === "free" || raw === "busy" ? raw : null;
}

export function parseLocation(raw: unknown): string | null {
  const v = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  return v || null;
}
