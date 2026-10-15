import { describe, expect, it } from "vitest";
import { parseAvailability, parseLocation } from "./availability";

describe("availability", () => {
  it("nimmt nur frei und busy", () => {
    expect(parseAvailability("free")).toBe("free");
    expect(parseAvailability("busy")).toBe("busy");
    expect(parseAvailability("weg")).toBeNull();
    expect(parseAvailability(null)).toBeNull();
  });
  it("kürzt und bereinigt den Ort", () => {
    expect(parseLocation("  Markt   platz ")).toBe("Markt platz");
    expect(parseLocation("   ")).toBeNull();
    expect(parseLocation("x".repeat(100))).toHaveLength(60);
  });
});
