// „Hört gerade“: Wer in Wortwinkel gerade einen Titel der Szenen-Musik abspielt (Presence-Kanal je Szene, ohne Datenbank).
export type ListenerPayload = { userId: string; name: string; trackId: string; at: number };
export type Listener = { userId: string; name: string; trackId: string };

// Aus dem Presence-Stand des Szenen-Kanals die Hörenden machen: je Person der neueste Eintrag, ohne dich selbst.
export function listenersFromPresence(state: Record<string, ListenerPayload[]>, selfId: string | null): Listener[] {
  const out: Listener[] = [];
  for (const [key, entries] of Object.entries(state)) {
    if (key === selfId) continue;
    const latest = [...entries].filter((e) => e && e.trackId).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0];
    if (!latest) continue;
    out.push({ userId: key, name: latest.name || "Jemand", trackId: latest.trackId });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "de"));
}

// „Anna hört gerade“, „Anna und Ben hören gerade“, „Anna, Ben und 2 weitere hören gerade“
export function listenersLabel(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} hört gerade`;
  if (names.length === 2) return `${names[0]} und ${names[1]} hören gerade`;
  const rest = names.length - 2;
  return `${names[0]}, ${names[1]} und ${rest} weitere hören gerade`;
}
