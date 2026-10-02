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

  it("behält die bereits vergebenen Schlüssel", () => {
    const keys = new Set(AUTO_BADGES.map((b) => b.key));
    for (const k of ["auto:first_post", "auto:posts_10", "auto:posts_50", "auto:likes_25", "auto:likes_100", "auto:comments_25", "auto:story_10", "auto:story_50", "auto:followers_10", "account:red_first", "account:red_posts_10", "account:red_poll", "account:red_comments_25", "account:red_reactions_25"]) {
      expect(keys.has(k)).toBe(true);
    }
  });
});
