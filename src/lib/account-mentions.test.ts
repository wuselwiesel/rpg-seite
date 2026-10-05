import { describe, expect, it } from "vitest";
import { findMentionedMembers, splitMentions } from "./account-mentions";

const members = [
  { id: "a", username: "Hörnchen" },
  { id: "b", username: "Streuselschnecke" },
];

describe("findMentionedMembers", () => {
  it("findet Erwähnungen unabhängig von der Schreibweise", () => {
    expect(findMentionedMembers("Hi @hörnchen und @STREUSELSCHNECKE!", members).sort()).toEqual(["a", "b"]);
  });
  it("ignoriert unbekannte Namen und Doppelte", () => {
    expect(findMentionedMembers("@niemand @Hörnchen @Hörnchen", members)).toEqual(["a"]);
  });
  it("ignoriert den Punkt am Satzende", () => {
    expect(findMentionedMembers("Danke @Hörnchen.", members)).toEqual(["a"]);
  });
});

describe("splitMentions", () => {
  it("trennt Text und Erwähnung", () => {
    const parts = splitMentions("Hallo @Hörnchen, wie geht's?", new Set(["hörnchen"]));
    expect(parts).toEqual([
      { text: "Hallo ", mention: false },
      { text: "@Hörnchen", mention: true },
      { text: ", wie geht's?", mention: false },
    ]);
  });
  it("lässt unbekannte @-Wörter normal", () => {
    expect(splitMentions("mail@test", new Set(["x"]))).toEqual([{ text: "mail@test", mention: false }]);
  });
});
