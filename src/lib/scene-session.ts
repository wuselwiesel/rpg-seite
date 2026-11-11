// Rückblick auf eine Session in einer Szene: Typen und kleine Helfer (ohne Server-Abhängigkeiten, auch für Client-Komponenten).
export const SESSION_TEXT_MAX = 600;

export type SessionStats = {
  messages: number;
  words: number;
  rolls: number;
  first_at: string | null;
  last_at: string | null;
  characters: { id: string | null; name: string; count: number }[];
};

export type SessionRating = {
  userId: string;
  characterName: string | null;
  stars: number;
  liked: string | null;
  disliked: string | null;
};

export type SceneSession = {
  id: string;
  endedBy: string;
  startedAt: string;
  endedAt: string;
  stats: SessionStats;
  ratings: SessionRating[];
};

// Sterne nur als ganze Zahl von 1 bis 5
export function clampStars(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

// Freitext: Leerraum an den Rändern weg, auf die Höchstlänge kürzen; leer = null
export function cleanSessionText(raw: unknown): string | null {
  const text = typeof raw === "string" ? raw.trim().slice(0, SESSION_TEXT_MAX) : "";
  return text || null;
}

export function averageStars(ratings: { stars: number }[]): number | null {
  if (ratings.length === 0) return null;
  return ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
}

// „2 Std. 15 Min.“, „40 Min.“ oder „unter 1 Min.“ zwischen erster und letzter Nachricht
export function durationLabel(firstAt: string | null, lastAt: string | null): string {
  if (!firstAt || !lastAt) return "–";
  const minutes = Math.round((new Date(lastAt).getTime() - new Date(firstAt).getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) return "unter 1 Min.";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? (m > 0 ? `${h} Std. ${m} Min.` : `${h} Std.`) : `${m} Min.`;
}

// Zahlen aus der Datenbank-Momentaufnahme absichern (fehlende oder falsche Werte werden 0 bzw. leer)
export function normalizeStats(raw: unknown): SessionStats {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const chars = Array.isArray(r.characters) ? r.characters : [];
  return {
    messages: num(r.messages),
    words: num(r.words),
    rolls: num(r.rolls),
    first_at: typeof r.first_at === "string" ? r.first_at : null,
    last_at: typeof r.last_at === "string" ? r.last_at : null,
    characters: chars
      .map((c) => {
        const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
        return { id: typeof o.id === "string" ? o.id : null, name: typeof o.name === "string" ? o.name : "?", count: num(o.count) };
      })
      .filter((c) => c.count > 0),
  };
}

export function sessionNoticeMessage(title: string): string {
  return `hat die Session in „${title}“ beendet. Bewerte, wie sie lief`;
}
