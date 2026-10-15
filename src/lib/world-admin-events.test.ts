import { describe, expect, it } from "vitest";
import type { ChoiceList } from "@/lib/choice-lists";
import { newlyFullEntries, parseMutedEvents } from "./world-admin-events";

describe("parseMutedEvents", () => {
  it("behält nur bekannte Ereignisse, ohne Doppelte", () => {
    expect(parseMutedEvents(["leave", "unbekannt", "leave", 3, "npc_new"])).toEqual(["leave", "npc_new"]);
  });
  it("macht aus allem anderen eine leere Liste", () => {
    expect(parseMutedEvents(null)).toEqual([]);
    expect(parseMutedEvents("leave")).toEqual([]);
  });
});

const lists: ChoiceList[] = [
  { id: "w", label: "Wesen", mode: "dropdown", isSpecies: true, options: [{ id: "1", label: "Werwolf", maxCount: 5 }, { id: "2", label: "Elf", maxCount: null }] },
  { id: "b", label: "Beruf", mode: "text", isSpecies: false, options: [] },
];

describe("newlyFullEntries", () => {
  it("meldet, wenn der letzte freie Platz vergeben wird", () => {
    expect(newlyFullEntries(lists, { w: "Werwolf" }, { w: { Werwolf: 4 } })).toEqual([{ list: "Wesen", entry: "Werwolf", max: 5 }]);
  });
  it("meldet nicht, solange noch Platz bleibt", () => {
    expect(newlyFullEntries(lists, { w: "Werwolf" }, { w: { Werwolf: 2 } })).toEqual([]);
  });
  it("meldet nicht erneut, wenn der Wert unverändert bleibt", () => {
    expect(newlyFullEntries(lists, { w: "Werwolf" }, { w: { Werwolf: 4 } }, { w: "Werwolf" })).toEqual([]);
  });
  it("ignoriert Einträge ohne Höchstzahl und Textlisten", () => {
    expect(newlyFullEntries(lists, { w: "Elf", b: "Bäckerin" }, { w: { Elf: 50 } })).toEqual([]);
  });
});
