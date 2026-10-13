import { describe, expect, it } from "vitest";
import { cleanTokenHash } from "./recovery-token";

describe("cleanTokenHash", () => {
  it("lässt typische Hashes durch", () => {
    const hash = "a".repeat(56);
    expect(cleanTokenHash(hash)).toBe(hash);
    expect(cleanTokenHash(`  ${hash}  `)).toBe(hash);
  });

  it("lehnt Leeres, Kurzes, Sonderzeichen und Nicht-Text ab", () => {
    expect(cleanTokenHash("")).toBeNull();
    expect(cleanTokenHash("abc")).toBeNull();
    expect(cleanTokenHash("a".repeat(20) + "?x=1")).toBeNull();
    expect(cleanTokenHash("a".repeat(200))).toBeNull();
    expect(cleanTokenHash(undefined)).toBeNull();
    expect(cleanTokenHash(["x"])).toBeNull();
  });
});
