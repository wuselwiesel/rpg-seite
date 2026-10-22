import { describe, expect, it } from "vitest";
import { parseSecretItems } from "./secret-items";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("parseSecretItems", () => {
  it("liest Zeilen mit Freigabe und kürzt", () => {
    const out = parseSecretItems(JSON.stringify([{ id: A, icon: "🦇", title: "Wesen", text: "Vampir", shared_with: [B, B, "kaputt"] }]));
    expect(out).toEqual([{ id: A, icon: "🦇", title: "Wesen", text: "Vampir", shared_with: [B] }]);
  });
  it("lässt unvollständige und kaputte Eingaben weg", () => {
    expect(parseSecretItems("nicht json")).toEqual([]);
    expect(parseSecretItems(JSON.stringify([{ title: "Nur Titel", text: "" }, 5, null]))).toEqual([]);
  });
  it("ignoriert ungültige IDs der Zeile", () => {
    expect(parseSecretItems([{ id: "x", title: "T", text: "Z" }])).toEqual([{ icon: "", title: "T", text: "Z", shared_with: [] }]);
  });
});
