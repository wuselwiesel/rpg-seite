import { describe, expect, it } from "vitest";
import { snippetAround } from "./search-snippet";

describe("snippetAround", () => {
  it("schneidet rund um den Treffer aus und markiert Kürzungen", () => {
    const text = `${"a ".repeat(100)}Nebelhafen${" b".repeat(100)}`;
    const s = snippetAround(text, "nebelhafen", 20);
    expect(s.startsWith("…")).toBe(true);
    expect(s.endsWith("…")).toBe(true);
    expect(s).toContain("Nebelhafen");
    expect(s.length).toBeLessThan(80);
  });

  it("nimmt ohne Treffer den Anfang und lässt Kurztext unverändert", () => {
    expect(snippetAround("Kurzer   Text", "xyz")).toBe("Kurzer Text");
    expect(snippetAround("x".repeat(500), "q", 10)).toBe(`${"x".repeat(20)}…`);
  });
});
