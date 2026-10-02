import { describe, expect, it } from "vitest";
import { characterAnchor, characterExcerpt, characterIndex, escapeLike, linkCharacterMentions, type CharacterTerm } from "./character-links";
import { autolinkHtml } from "./autolink";

const ID = "11111111-1111-4111-8111-111111111111";
const lucian: CharacterTerm = { id: ID, name: "Lucian", avatarUrl: "https://x/a.png", excerpt: "Ein <Vampir> & \"Dichter\"" };

describe("linkCharacterMentions", () => {
  it("macht aus einer Erwähnung einen Link mit Vorschau-Daten (maskiert)", () => {
    const html = `<p>Siehe <span class="mention" data-type="mention" data-id="${ID}">@Lucian</span>.</p>`;
    const out = linkCharacterMentions(html, new Map([[ID, lucian]]));
    expect(out).toContain(`href="/characters/${ID}"`);
    expect(out).toContain(">@Lucian</a>");
    expect(out).toContain('data-wiki-cat="Charakter"');
    expect(out).toContain("&lt;Vampir&gt; &amp; &quot;Dichter&quot;");
    expect(out).not.toContain("<span");
  });
  it("lässt unbekannte Personen und andere Spans unberührt", () => {
    const html = `<span data-type="mention" data-id="22222222-2222-4222-8222-222222222222">@Fremd</span><span class="x">a</span>`;
    expect(linkCharacterMentions(html, new Map([[ID, lucian]]))).toBe(html);
  });
});

describe("[[Name]] verlinkt Charaktere, wenn es keine Seite gibt", () => {
  const chars = [lucian];
  const wiki = [{ id: "w1", title: "Vampire", category: "Wesen", excerpt: "x" }];
  it("Wiki-Seite gewinnt vor Charakter, Charakter vor rotem Link", () => {
    const out = autolinkHtml("[[Vampire]] [[lucian]] [[Unbekannt]]", { wiki, characters: chars });
    expect(out).toContain('href="/wiki/w1"');
    expect(out).toContain(`href="/characters/${ID}"`);
    expect(out).toContain('class="wiki-missing"');
  });
  it("[[Name|Text]] zeigt den Text", () => {
    expect(autolinkHtml("[[Lucian|der Dichter]]", { wiki, characters: chars })).toContain(">der Dichter</a>");
  });
});

describe("Hilfsfunktionen", () => {
  it("kürzt Auszüge und maskiert LIKE-Zeichen", () => {
    expect(characterExcerpt("<p>" + "a".repeat(300) + "</p>").length).toBe(200);
    expect(characterExcerpt(null, "Vampir")).toBe("Vampir");
    expect(escapeLike("50%_x\\")).toBe("50\\%\\_x\\\\");
    expect(characterIndex([lucian]).get("lucian")).toBe(lucian);
    expect(characterAnchor(lucian, "L")).toContain('class="wiki-link wiki-char"');
  });
});
