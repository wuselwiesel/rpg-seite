import { describe, expect, it } from "vitest";
import { ACCOUNT_CATEGORIES, AUTO_BADGES, CHARACTER_CATEGORIES } from "./badges";

describe("Badge-Katalog", () => {
  it("hat eindeutige Schlüssel mit passendem Präfix", () => {
    const keys = AUTO_BADGES.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const b of AUTO_BADGES) expect(b.key.startsWith(b.scope === "account" ? "account:" : "auto:")).toBe(true);
  });

  it("ordnet jedes Badge einer bekannten Kategorie zu", () => {
    for (const b of AUTO_BADGES) {
      const cats: readonly string[] = b.scope === "account" ? ACCOUNT_CATEGORIES : CHARACTER_CATEGORIES;
      expect(cats).toContain(b.category);
    }
  });

  it("behält die Schlüssel, deren Schwelle unverändert blieb (sie sind schon vergeben)", () => {
    const keys = new Set(AUTO_BADGES.map((b) => b.key));
    for (const k of ["auto:posts_10", "auto:posts_50", "auto:media_10", "auto:media_50", "auto:story_25", "auto:followers_10", "auto:days_30", "auto:days_365", "account:red_posts_10", "account:red_posts_50", "account:vote_10", "account:friends_5", "account:acc_365"]) {
      expect(keys.has(k)).toBe(true);
    }
  });

  it("hat keine Einsteiger-Badges: jede Schwelle verlangt echte Aktivität", () => {
    for (const b of AUTO_BADGES) expect(b.threshold, b.key).toBeGreaterThanOrEqual(3);
  });

  it("steigert die Schwellen innerhalb einer Leiter", () => {
    const byMetric = new Map<string, number[]>();
    for (const b of AUTO_BADGES) byMetric.set(`${b.scope}:${b.metric}`, [...(byMetric.get(`${b.scope}:${b.metric}`) ?? []), b.threshold]);
    for (const [metric, list] of byMetric) expect(list, metric).toEqual([...list].sort((a, b) => a - b));
  });

  it("nennt die Schwelle im Schlüssel, damit Änderungen auffallen", () => {
    for (const b of AUTO_BADGES) {
      const num = b.key.match(/_(\d+)(?:_red)?$/);
      if (num) expect(Number(num[1]), b.key).toBe(b.threshold);
    }
  });
});
