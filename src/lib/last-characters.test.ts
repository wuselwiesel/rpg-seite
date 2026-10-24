import { describe, expect, it } from "vitest";
import { lastCharacterFor, parseLastCharacters, rememberLastCharacter } from "./last-characters";

const w1 = "11111111-1111-1111-1111-111111111111";
const w2 = "22222222-2222-2222-2222-222222222222";
const c1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const c2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("last characters", () => {
  it("merkt sich je Welt den zuletzt gewählten Charakter", () => {
    let raw = rememberLastCharacter(null, w1, c1);
    raw = rememberLastCharacter(raw, w2, c2);
    expect(lastCharacterFor(raw, w1)).toBe(c1);
    expect(lastCharacterFor(raw, w2)).toBe(c2);
    raw = rememberLastCharacter(raw, w1, c2);
    expect(lastCharacterFor(raw, w1)).toBe(c2);
  });
  it("ignoriert kaputte oder fremde Werte", () => {
    expect(parseLastCharacters("kein json")).toEqual({});
    expect(parseLastCharacters('["x"]')).toEqual({});
    expect(parseLastCharacters(JSON.stringify({ [w1]: "abc", x: c1 }))).toEqual({});
    expect(lastCharacterFor(undefined, w1)).toBeNull();
  });
  it("behält höchstens 30 Welten, die neuesten", () => {
    let raw = "";
    for (let i = 0; i < 35; i++) raw = rememberLastCharacter(raw, `${String(i).padStart(8, "0")}-0000-0000-0000-000000000000`, c1);
    const keys = Object.keys(parseLastCharacters(raw));
    expect(keys).toHaveLength(30);
    expect(keys.at(-1)).toBe("00000034-0000-0000-0000-000000000000");
  });
});
