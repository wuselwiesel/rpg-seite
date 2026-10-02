import { describe, expect, it } from "vitest";
import { autolinkHtml, type WikiTerm } from "./autolink";

const term = (id: string, title: string): WikiTerm => ({ id, title, category: "sonstiges", excerpt: "Kurztext" });

describe("autolinkHtml", () => {
  const wiki = [term("v", "Vampire"), term("w", "Werwölfe"), term("d", "Dana's Haus")];

  it("verlinkt Wiki-Begriffe auch ohne Hashtag-Modus (Wiki-Seiten)", () => {
    const out = autolinkHtml("<p>Werwölfe sind gegen Vampire resistent.</p>", { wiki });
    expect(out).toContain('href="/wiki/w"');
    expect(out).toContain('href="/wiki/v"');
  });

  it("verlinkt jeden Begriff nur einmal und überspringt die eigene Seite", () => {
    const out = autolinkHtml("<p>Vampire und wieder Vampire</p>", { wiki, excludeWikiId: "w" });
    expect(out.match(/class="wiki-link"/g)).toHaveLength(1);
    const own = autolinkHtml("<p>Vampire</p>", { wiki, excludeWikiId: "v" });
    expect(own).not.toContain("wiki-link");
  });

  it("verlinkt Hashtags und Begriffe gemeinsam", () => {
    const out = autolinkHtml("<p>#Nebel und Vampire</p>", { wiki, tagHref: "/redaktion" });
    expect(out).toContain('class="hashtag"');
    expect(out).toContain('href="/wiki/v"');
  });

  it("verlinkt nur Hashtags, wenn es keine Begriffe gibt", () => {
    const out = autolinkHtml("<p>#Nebel</p>", { wiki: [], tagHref: "/redaktion" });
    expect(out).toContain('class="hashtag"');
  });

  it("lässt Titel mit Apostroph und Sonderzeichen zu", () => {
    const out = autolinkHtml("<p>Bei Dana's Haus brennt Licht.</p>", { wiki });
    expect(out).toContain('href="/wiki/d"');
  });

  it("ändert nichts, wenn weder Begriffe noch Hashtag-Modus aktiv sind", () => {
    expect(autolinkHtml("<p>Text</p>", {})).toBe("<p>Text</p>");
  });
});
