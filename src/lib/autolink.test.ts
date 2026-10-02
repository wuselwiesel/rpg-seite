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

describe("Wiki-Verlinkungen mit [[…]]", () => {
  const wiki = [term("v", "Vampire"), term("h", "Die Hexen")];

  it("verlinkt [[Titel]] und [[Titel|Anzeigetext]] auf vorhandene Seiten", () => {
    const out = autolinkHtml("<p>Siehe [[Vampire]] und [[Hexen|die Magierinnen]].</p>", { wiki });
    expect(out).toContain('href="/wiki/v"');
    expect(out).toContain(">Vampire</a>");
    expect(out).toContain('href="/wiki/h"');
    expect(out).toContain(">die Magierinnen</a>");
    expect(out).not.toContain("[[");
  });

  it("macht unbekannte Titel zu roten Links zum Anlegen", () => {
    const out = autolinkHtml("<p>[[Daylight Ring]]</p>", { wiki });
    expect(out).toContain('class="wiki-missing"');
    expect(out).toContain("/wiki/new?title=Daylight%20Ring");
  });

  it("lässt Klammern in Links und ohne Begriffe unverändert", () => {
    expect(autolinkHtml('<p><a href="/x">[[Vampire]]</a></p>', { wiki })).toContain("[[Vampire]]");
    expect(autolinkHtml("<p>[[X]]</p>", {})).toBe("<p>[[X]]</p>");
  });
});
