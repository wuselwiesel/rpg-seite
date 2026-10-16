import { describe, expect, it } from "vitest";
import { buildSegments, plainWithNames, segmentCharacterIds, segmentsToPlain, splitSegments } from "./segments";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("segments", () => {
  it("baut und zerlegt Abschnitte", () => {
    const html = buildSegments([
      { id: A, name: 'Felicity "Fee" Barnes', html: "<p>Sie ging runter.</p>" },
      { id: B, name: "Nick", html: "<p>Er sah auf.</p><p>„Hey“</p>" },
    ]);
    const parts = splitSegments(html);
    expect(parts).toEqual([
      { id: A, name: 'Felicity "Fee" Barnes', html: "<p>Sie ging runter.</p>" },
      { id: B, name: "Nick", html: "<p>Er sah auf.</p><p>„Hey“</p>" },
    ]);
    expect(segmentCharacterIds(html)).toEqual([A, B]);
  });
  it("normale Nachrichten sind nicht gebündelt", () => {
    expect(splitSegments("<p>Hallo</p>")).toBeNull();
    expect(segmentCharacterIds("<p>Hallo</p>")).toEqual([]);
  });
  it("Text außerhalb der Abschnitte oder falsche ID gilt nicht als Bündel", () => {
    expect(splitSegments(`<p>Vorspann</p><div data-type="segment" data-id="${A}" data-name="X"><p>a</p></div>`)).toBeNull();
    expect(splitSegments('<div data-type="segment" data-id="kaputt" data-name="X"><p>a</p></div>')).toBeNull();
  });
});

describe("Bündel als Klartext", () => {
  const html = buildSegments([
    { id: "11111111-1111-1111-1111-111111111111", name: "Ada", html: "<p>Hallo <b>du</b></p><p>zweiter Absatz</p>" },
    { id: "22222222-2222-2222-2222-222222222222", name: "Ben", html: "<p>Moin</p>" },
  ]);
  it("trennt die Figuren eines Bündels", () => {
    expect(segmentsToPlain(html, "Ada")).toEqual([
      { name: "Ada", text: "Hallo du zweiter Absatz" },
      { name: "Ben", text: "Moin" },
    ]);
  });
  it("normale Nachrichten bleiben ein Eintrag", () => {
    expect(segmentsToPlain("<p>Nur ich</p>", "Cleo")).toEqual([{ name: "Cleo", text: "Nur ich" }]);
  });
  it("eine Zeile mit Namen nur bei Bündeln", () => {
    expect(plainWithNames(html)).toBe("Ada: Hallo du zweiter Absatz Ben: Moin");
    expect(plainWithNames("<p>Nur ich</p>", "Cleo")).toBe("Nur ich");
  });
});
