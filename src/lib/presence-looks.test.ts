import { describe, expect, it } from "vitest";
import { deriveLooks, WRITING_TTL } from "./presence-looks";

describe("deriveLooks", () => {
  it("zeigt „schreibt“ bei frischer Meldung und meldet, wann neu geprüft wird", () => {
    const seen = new Map<string, number>();
    const { looks, nextCheckIn } = deriveLooks({ a: [{ at: 1000, writing: true, emoji: "🌙" }] }, seen, 1500);
    expect(looks.get("a")).toEqual({ emoji: "🌙", text: null, writing: true });
    expect(nextCheckIn).toBe(WRITING_TTL);
  });

  it("lässt „schreibt“ verfallen, wenn keine neue Meldung kommt", () => {
    const seen = new Map<string, number>();
    const raw = { a: [{ at: 1000, writing: true }] };
    deriveLooks(raw, seen, 1500);
    const later = deriveLooks(raw, seen, 1500 + WRITING_TTL + 100);
    expect(later.looks.get("a")?.writing).toBe(false);
    expect(later.nextCheckIn).toBeNull();
  });

  it("erneuert den Zeitgeber bei neuer Meldung", () => {
    const seen = new Map<string, number>();
    deriveLooks({ a: [{ at: 1000, writing: true }] }, seen, 1500);
    const next = deriveLooks({ a: [{ at: 6000, writing: true }] }, seen, 6200);
    expect(next.looks.get("a")?.writing).toBe(true);
  });

  it("ignoriert eine uralte Meldung sofort", () => {
    const { looks } = deriveLooks({ a: [{ at: 1000, writing: true }] }, new Map(), 1000 + 60_000);
    expect(looks.get("a")?.writing).toBe(false);
  });

  it("bleibt online, auch wenn ein anderes Gerät nicht schreibt", () => {
    const { looks } = deriveLooks({ a: [{ at: 1000, writing: false }, { at: 900, writing: false }] }, new Map(), 1200);
    expect(looks.get("a")).toEqual({ emoji: null, text: null, writing: false });
  });
});
