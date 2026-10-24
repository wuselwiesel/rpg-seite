// Merkt sich je Welt den zuletzt gewählten Charakter (Cookie „last_characters“, JSON {weltId: charakterId}), damit man nach einem
// Weltwechsel wieder mit dem Charakter weiterspielt, den man dort zuletzt hatte, statt mit dem ersten.
export const LAST_CHARACTERS_COOKIE = "last_characters";
const MAX_WORLDS = 30;
const UUID = /^[0-9a-f-]{36}$/i;

export function parseLastCharacters(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: Record<string, string> = {};
    for (const [world, character] of Object.entries(value)) {
      if (UUID.test(world) && typeof character === "string" && UUID.test(character)) out[world] = character;
    }
    return out;
  } catch {
    return {};
  }
}

// Neuer Cookie-Wert: dieser Charakter ist jetzt der zuletzt gewählte der Welt (neueste Welt zuletzt, höchstens MAX_WORLDS)
export function rememberLastCharacter(raw: string | null | undefined, worldId: string, characterId: string): string {
  const map = parseLastCharacters(raw);
  delete map[worldId];
  map[worldId] = characterId;
  const entries = Object.entries(map).slice(-MAX_WORLDS);
  return JSON.stringify(Object.fromEntries(entries));
}

export function lastCharacterFor(raw: string | null | undefined, worldId: string): string | null {
  return parseLastCharacters(raw)[worldId] ?? null;
}
