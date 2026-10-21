import { describe, expect, it } from "vitest";
import { senderHue } from "./sender-color";

describe("senderHue", () => {
  it("ist stabil und im Farbkreis", () => {
    expect(senderHue("abc")).toBe(senderHue("abc"));
    expect(senderHue("abc")).toBeGreaterThanOrEqual(0);
    expect(senderHue("abc")).toBeLessThan(360);
  });
  it("unterscheidet Figuren", () => {
    expect(senderHue("a")).not.toBe(senderHue("b"));
  });
});
