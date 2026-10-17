// NPCs: Charaktere ohne Spieler:in dahinter. `owner_id` ist die Person, die den NPC angelegt hat (Anleger:in).
// Bearbeiten dürfen Anleger:in und alle Admins der Welt (Besitzer:in und ernannte); zwischen NPC und Charakter umschalten darf nur die Anleger:in.
// (Die Datenbank erzwingt dasselbe über Policies und einen Trigger; das hier steuert nur, was die Oberfläche anbietet.)

type CharacterLike = { owner_id: string; is_npc?: boolean | null; vacant?: boolean | null };

export function isNpc(c: { is_npc?: boolean | null }): boolean {
  return c.is_npc === true;
}

// worldAdminIds: Besitzer:in und Admins der Welt
export function canEditCharacter(c: CharacterLike, userId: string, worldAdminIds: readonly string[] | null | undefined): boolean {
  if (c.owner_id === userId) return true;
  // NPCs und freie Charaktere (ohne Spieler:in) pflegen auch die Admins
  return (isNpc(c) || c.vacant === true) && Boolean(worldAdminIds?.includes(userId));
}

export function canToggleNpc(c: CharacterLike, userId: string): boolean {
  return c.owner_id === userId;
}

// Nach Art trennen (Reihenfolge bleibt): normale Charaktere und NPCs.
export function splitNpcs<T extends { is_npc?: boolean | null }>(list: T[]): { characters: T[]; npcs: T[] } {
  return { characters: list.filter((c) => !isNpc(c)), npcs: list.filter((c) => isNpc(c)) };
}
