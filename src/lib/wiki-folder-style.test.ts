import { describe, expect, it } from "vitest";
import { folderColorHex, parseFolderColor, parseFolderIcon } from "./wiki-folder-style";

describe("wiki-folder-style", () => {
  it("kennt nur die festen Farben", () => {
    expect(parseFolderColor("sage")).toBe("sage");
    expect(parseFolderColor("#ff0000")).toBeNull();
    expect(folderColorHex("plum")).toBe("#9a6fb0");
    expect(folderColorHex(null)).toBeNull();
  });
  it("lässt Emoji und :eigene: durch, lehnt Unbrauchbares ab", () => {
    expect(parseFolderIcon(" 🏰 ")).toBe("🏰");
    expect(parseFolderIcon(":wolke:")).toBe(":wolke:");
    expect(parseFolderIcon("")).toBeNull();
    expect(parseFolderIcon("<b>")).toBeNull();
    expect(parseFolderIcon("x".repeat(41))).toBeNull();
  });
});
