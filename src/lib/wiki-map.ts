// Karten im Wiki: Pins liegen in Prozent (0–100) auf dem Bild, damit sie bei jeder Größe an derselben Stelle sitzen.

export type WikiMap = {
  id: string;
  world_id: string;
  title: string;
  description: string | null;
  image_url: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WikiMapPin = {
  id: string;
  map_id: string;
  x: number;
  y: number;
  label: string;
  icon: string | null;
  page_id: string | null;
  target_map_id: string | null;
};

export const MIN_SCALE = 1;
export const MAX_SCALE = 8;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;

// Prozentwert innerhalb eines Rechtecks (z. B. getBoundingClientRect des gezoomten Bildes); außerhalb wird auf den Rand gesetzt.
export function pointToPercent(rect: { left: number; top: number; width: number; height: number }, clientX: number, clientY: number) {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return {
    x: round3(clamp(((clientX - rect.left) / rect.width) * 100, 0, 100)),
    y: round3(clamp(((clientY - rect.top) / rect.height) * 100, 0, 100)),
  };
}

export type View = { scale: number; tx: number; ty: number };

// Bild so verschieben, dass es den Ausschnitt (w × h) immer ausfüllt; bei Zoom 1 sitzt es bei 0/0.
export function clampView(v: View, w: number, h: number): View {
  const scale = clamp(v.scale, MIN_SCALE, MAX_SCALE);
  return { scale, tx: clamp(v.tx, w - w * scale, 0), ty: clamp(v.ty, h - h * scale, 0) };
}

// Zoom um einen Punkt (px, py im Ausschnitt): der Punkt unter dem Finger/Mauszeiger bleibt, wo er ist.
export function zoomAround(v: View, factor: number, px: number, py: number, w: number, h: number): View {
  const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
  const k = scale / v.scale;
  return clampView({ scale, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k }, w, h);
}

// Ansicht, die einen Pin (in Prozent) bei gegebenem Zoom in die Mitte rückt.
export function viewCenteredOn(x: number, y: number, scale: number, w: number, h: number): View {
  return clampView({ scale, tx: w / 2 - (x / 100) * w * scale, ty: h / 2 - (y / 100) * h * scale }, w, h);
}

export type PinInput = { label: string; icon: string | null; pageId: string | null; targetMapId: string | null };

// Bereinigt Eingaben aus dem Pin-Formular. Seite und Zielkarte schließen sich nicht aus (ein Pin kann beides tragen).
export function cleanPinInput(raw: { label?: string; icon?: string; pageId?: string; targetMapId?: string }): PinInput | { error: string } {
  const label = (raw.label ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!label) return { error: "Bitte gib dem Pin einen Namen." };
  const icon = (raw.icon ?? "").trim().slice(0, 40) || null;
  return { label, icon, pageId: raw.pageId || null, targetMapId: raw.targetMapId || null };
}

export function cleanMapTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 120);
}
