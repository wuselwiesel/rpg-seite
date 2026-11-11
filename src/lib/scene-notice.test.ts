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
  it("Bearbeitet ohne Zusatz", () => {
    expect(sceneNoticeMessage("Herbstball", "", "e1")).toBe("hat in „Herbstball“ einen Beitrag bearbeitet");
  });
  it("Bearbeitet mit Zusatz", () => {
    expect(sceneNoticeMessage("Herbstball", "schau nochmal rein", "e1")).toBe("hat in „Herbstball“ einen Beitrag bearbeitet: schau nochmal rein");
  });
  it("Eigener Text", () => {
    expect(sceneNoticeMessage("Herbstball", "Bist du noch da?", null)).toBe("hat dir zu „Herbstball“ geschrieben: Bist du noch da?");
  });
});

describe("sceneNoticeLink", () => {
  it("springt zum bearbeiteten Beitrag", () => {
    expect(sceneNoticeLink("s1", "e1", "c1")).toBe("/story/s1#beitrag-e1");
  });
  it("führt sonst ans Ende der Szene", () => {
    expect(sceneNoticeLink("s1", null, "c1")).toBe("/story/s1?as=c1&ziel=ende");
  });
});
