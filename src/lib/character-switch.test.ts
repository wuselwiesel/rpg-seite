import { describe, expect, it } from "vitest";
import { characterPathAfterSwitch } from "./character-switch";

const own = ["a", "b"];

describe("characterPathAfterSwitch", () => {
  it("Profil eines eigenen Charakters: Profil des neuen", () => {
    expect(characterPathAfterSwitch("/characters/a", own, "b")).toBe("/characters/b");
  });
  it("ChaBo eines eigenen Charakters: ChaBo des neuen", () => {
    expect(characterPathAfterSwitch("/characters/a/chabo", own, "b")).toBe("/characters/b/chabo");
  });
  it("fremder Charakter oder andere Seiten: nur neu laden", () => {
    expect(characterPathAfterSwitch("/characters/x", own, "b")).toBeNull();
    expect(characterPathAfterSwitch("/characters/x/chabo", own, "b")).toBeNull();
    expect(characterPathAfterSwitch("/story", own, "b")).toBeNull();
    expect(characterPathAfterSwitch("/characters/a/edit", own, "b")).toBeNull();
    expect(characterPathAfterSwitch(null, own, "b")).toBeNull();
  });
});
