// Stand der Online-Anzeige aus dem Presence-Kanal: wer ist online, mit welchem Emoji/Text, und schreibt die Person gerade?
export type TrackPayload = { at: number; emoji?: string | null; text?: string | null; writing?: boolean };
export type PresenceLook = { emoji: string | null; text: string | null; writing?: boolean };

// „schreibt“ wird alle 4 s erneuert und verfällt für Zuschauer nach 8 s (oder wenn die Meldung älter als 20 s ist)
export const WRITING_REFRESH = 4000;
export const WRITING_TTL = 8000;
export const WRITING_STALE = 20000;

// seen merkt sich, wann ein „schreibt“-Stand (Account + Zeitstempel der Meldung) zum ersten Mal auftauchte. Ein Stand ohne
// frische Meldung (Gerät eingefroren, Verbindung weg, Abmeldung verloren) verfällt, statt für immer „schreibt gerade“ zu zeigen.
export function deriveLooks(
  raw: Record<string, TrackPayload[]>,
  seen: Map<string, number>,
  now: number,
): { looks: Map<string, PresenceLook>; nextCheckIn: number | null } {
  const looks = new Map<string, PresenceLook>();
  const live = new Set<string>();
  let soonest = Infinity;
  for (const [key, entries] of Object.entries(raw)) {
    const latest = [...entries].sort((x, y) => (y.at ?? 0) - (x.at ?? 0))[0];
    let writing = false;
    for (const e of entries) {
      if (e.writing !== true) continue;
      const id = `${key}:${e.at ?? 0}`;
      live.add(id);
      const first = seen.get(id) ?? now;
      seen.set(id, first);
      const remaining = WRITING_TTL - (now - first);
      if (remaining > 0 && !(e.at && now - e.at > WRITING_STALE)) {
        writing = true;
        soonest = Math.min(soonest, remaining);
      }
    }
    looks.set(key, { emoji: latest?.emoji ?? null, text: latest?.text ?? null, writing });
  }
  for (const id of [...seen.keys()]) if (!live.has(id)) seen.delete(id);
  return { looks, nextCheckIn: soonest === Infinity ? null : soonest };
}
