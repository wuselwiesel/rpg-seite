import { describe, expect, it } from "vitest";
import { SCENE_NOTICE_MAX, cleanNoticeText, sceneNoticeLink, sceneNoticeMessage } from "./scene-notice";

describe("cleanNoticeText", () => {
  it("fasst Leerraum zusammen und trimmt", () => {
    expect(cleanNoticeText("  Hallo \n\n  Welt  ")).toBe("Hallo Welt");
  });
  it("kürzt auf die Höchstlänge", () => {
    expect(cleanNoticeText("a".repeat(500))).toHaveLength(SCENE_NOTICE_MAX);
  });
  it("verträgt leere Eingaben", () => {
    expect(cleanNoticeText(undefined)).toBe("");
    expect(cleanNoticeText(null)).toBe("");
  });
});

describe("sceneNoticeMessage", () => {
  it("setzt Szene und eigenen Text ein", () => {
    expect(sceneNoticeMessage("Herbstball", "Bist du noch da?")).toBe("hat dir zu „Herbstball“ geschrieben: Bist du noch da?");
  });
});

describe("sceneNoticeLink", () => {
  it("führt ans Ende der Szene als der Charakter", () => {
    expect(sceneNoticeLink("s1", "c1")).toBe("/story/s1?as=c1&ziel=ende");
  });
});
