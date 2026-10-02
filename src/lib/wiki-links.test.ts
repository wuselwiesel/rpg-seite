import { describe, expect, it } from "vitest";
import { bracketTargets, findBacklinks, findMissingLinks, titleIndex, type LinkPage } from "./wiki-links";

const page = (id: string, title: string, content: string, aliases: string[] = []): LinkPage => ({ id, title, content, aliases });
const pages = [
  page("v", "Vampire", "<p>Siehe [[Werwölfe]] und [[Daylight Ring]].</p>"),
  page("w", "Werwölfe", "<p>Gift ist für Vampire tödlich.</p>"),
  page("h", "Hexen", "<p>Sie fertigen [[Daylight Ring|Schmuck]]. Mehr bei [[vampire]].</p>", ["Magierinnen"]),
  page("x", "Haus", "<p>Ein Haus am Wald, in dem die Magierinnen wohnen.</p>"),
];

describe("Wiki-Rückverweise", () => {
  it("liest Ziele aus [[…]]", () => {
    expect(bracketTargets("<p>[[A]] und [[B|zeigt]]</p>")).toEqual(["A", "B"]);
  });

  it("findet explizite Verlinkungen und Erwähnungen", () => {
    expect(findBacklinks(pages, "w").sort()).toEqual(["v"]);
    expect(findBacklinks(pages, "v").sort()).toEqual(["h", "w"]);
  });

  it("beachtet Alternativnamen und ignoriert die eigene Seite", () => {
    expect(findBacklinks(pages, "h")).toEqual(["x"]);
    expect(findBacklinks(pages, "x")).toEqual([]);
  });

  it("listet fehlende Seiten mit Häufigkeit", () => {
    expect(findMissingLinks(pages)).toEqual([{ title: "Daylight Ring", count: 2, from: ["v", "h"] }]);
  });

  it("baut einen Index über Titel und Alternativnamen", () => {
    const idx = titleIndex(pages);
    expect(idx.get("magierinnen")?.id).toBe("h");
    expect(idx.get("vampire")?.id).toBe("v");
  });
});
