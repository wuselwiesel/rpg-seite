import { describe, expect, it } from "vitest";
import { chapterAnchor, chapterLabelText, chapterNumber, chapterOneTitle } from "./chapters";

describe("Kapitel in einer Szene", () => {
  it("zählt Marken ab Kapitel 2, weil Kapitel 1 der Szenenanfang ist", () => {
    expect([0, 1, 2].map(chapterNumber)).toEqual([2, 3, 4]);
  });
  it("baut stabile Anker aus der Marken-ID", () => {
    expect(chapterAnchor("abc-123")).toBe("kapitel-abc-123");
  });
  it("nimmt die eigene Bezeichnung oder „Kapitel N“", () => {
    expect(chapterLabelText("Teil II", 3)).toBe("Teil II");
    expect(chapterLabelText("  ", 3)).toBe("Kapitel 3");
    expect(chapterLabelText(null, 2)).toBe("Kapitel 2");
  });
  it("nennt Kapitel 1 „Anfang“, solange es keinen Namen hat", () => {
    expect(chapterOneTitle({ title: null, label: null })).toBe("Anfang");
    expect(chapterOneTitle({ title: " Ankunft ", label: null })).toBe("Ankunft");
  });
});
