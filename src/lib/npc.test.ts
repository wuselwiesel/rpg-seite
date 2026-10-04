import { describe, expect, it } from "vitest";
import { canEditCharacter, canToggleNpc, isNpc, splitNpcs } from "./npc";

const npc = { owner_id: "anleger", is_npc: true };
const normal = { owner_id: "spieler", is_npc: false };

describe("Berechtigungen", () => {
  it("Anleger:in bearbeitet immer, die Welt-Besitzerin nur NPCs", () => {
    expect(canEditCharacter(npc, "anleger", "chef")).toBe(true);
    expect(canEditCharacter(npc, "chef", "chef")).toBe(true);
    expect(canEditCharacter(normal, "chef", "chef")).toBe(false);
    expect(canEditCharacter(normal, "spieler", "chef")).toBe(true);
    expect(canEditCharacter(npc, "fremd", "chef")).toBe(false);
    expect(canEditCharacter(npc, "chef", null)).toBe(false);
    expect(canEditCharacter({ owner_id: "a" }, "chef", "chef")).toBe(false);
  });
  it("Umschalten darf nur die Anleger:in, nicht einmal die Welt-Besitzerin", () => {
    expect(canToggleNpc(npc, "anleger")).toBe(true);
    expect(canToggleNpc(npc, "chef")).toBe(false);
    expect(canToggleNpc(normal, "spieler")).toBe(true);
  });
  it("trennt NPCs von Charakteren, Reihenfolge bleibt", () => {
    const list = [{ id: 1, is_npc: false }, { id: 2, is_npc: true }, { id: 3 }, { id: 4, is_npc: true }];
    const { characters, npcs } = splitNpcs(list);
    expect(characters.map((c) => c.id)).toEqual([1, 3]);
    expect(npcs.map((c) => c.id)).toEqual([2, 4]);
    expect(isNpc({ is_npc: null })).toBe(false);
  });
});
