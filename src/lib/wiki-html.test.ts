import { describe, expect, it } from "vitest";
import { addHeadingIds } from "./wiki-html";

describe("addHeadingIds", () => {
  it("vergibt fortlaufende ids und sammelt Überschriften", () => {
    const r = addHeadingIds("<p>a</p><h2>Entstehung</h2><p>b</p><h3><strong>Schritte</strong></h3>");
    expect(r.html).toContain('<h2 id="abschnitt-1">Entstehung</h2>');
    expect(r.html).toContain('<h3 id="abschnitt-2"><strong>Schritte</strong></h3>');
    expect(r.headings).toEqual([
      { id: "abschnitt-1", text: "Entstehung", level: 2 },
      { id: "abschnitt-2", text: "Schritte", level: 3 },
    ]);
  });

  it("lässt Text ohne Überschriften unverändert", () => {
    expect(addHeadingIds("<p>nur Text</p>")).toEqual({ html: "<p>nur Text</p>", headings: [] });
  });
});
