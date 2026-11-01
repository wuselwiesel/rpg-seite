import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WikiTocNav } from "./wiki-toc-nav";

const items = [
  { id: "abschnitt-1", text: "Zweck", level: 2 as const, number: "1." },
  { id: "abschnitt-2", text: "Vorbereitung", level: 3 as const, number: "1.1" },
];

describe("WikiTocNav", () => {
  it("seitlich: nur auf breiten Seiten, mit Nummern und Titel", () => {
    const html = renderToStaticMarkup(<WikiTocNav items={items} title="Inhalt" variant="side" />);
    expect(html).toContain("@3xl:block");
    expect(html).toContain('href="#abschnitt-2"');
    expect(html).toContain("1.1");
    expect(html).toContain("Inhalt");
  });

  it("über dem Text: Aufklappfeld, geöffnet, immer sichtbar", () => {
    const html = renderToStaticMarkup(<WikiTocNav items={items} title="Inhalt" variant="top" />);
    expect(html).toContain("<details");
    expect(html).toContain("open");
    expect(html).not.toContain("@3xl:hidden");
  });

  it("am Handy bei seitlichem Verzeichnis: eingeklappt und auf breiten Seiten ausgeblendet", () => {
    const html = renderToStaticMarkup(<WikiTocNav items={items} title="Inhalt" variant="mobile" />);
    expect(html).toContain("@3xl:hidden");
    expect(html).not.toMatch(/<details[^>]*\sopen/);
  });
});
