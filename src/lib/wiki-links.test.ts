import { describe, expect, it } from "vitest";
import { bracketTargets, buildLinkEdges, findBacklinks, findMissingLinks, titleIndex, type LinkPage } from "./wiki-links";

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

describe("findMissingLinks mit bekannten Namen", () => {
  it("ignoriert Namen, die zu Charakteren gehören", () => {
    const pages = [{ id: "1", title: "A", content: "<p>[[Lucian]] und [[Hexen]]</p>" }];
    expect(findMissingLinks(pages).map((m) => m.title)).toEqual(["Hexen", "Lucian"].sort());
    expect(findMissingLinks(pages, ["lucian"]).map((m) => m.title)).toEqual(["Hexen"]);
  });
});

describe("buildLinkEdges", () => {
  const pages = [
    { id: "v", title: "Vampire", content: "<p>Leben in [[Nebelhafen]]. Sie jagen Werwölfe.</p>", aliases: ["Blutsauger"] },
    { id: "n", title: "Nebelhafen", content: "<p>Hier wohnen Blutsauger.</p>" },
    { id: "w", title: "Werwölfe", content: "<p>Nichts.</p>" },
    { id: "s", title: "Sireline", content: "<p>Unterseite.</p>", parent_page_id: "v" },
    { id: "x", title: "Allein", content: "<p>Niemand kennt mich.</p>" },
  ];
  const edges = buildLinkEdges(pages);
  const find = (a: string, b: string) => edges.find((e) => [e.a, e.b].sort().join() === [a, b].sort().join());

  it("findet [[Titel]] und Erwähnungen (auch über Alternativnamen), ohne Selbstverweise", () => {
    expect(find("v", "n")).toBeTruthy();
    expect(find("v", "w")).toBeTruthy();
    expect(edges.some((e) => e.a === e.b)).toBe(false);
  });
  it("fasst Verweise in beide Richtungen zu einer Kante zusammen", () => {
    expect(find("v", "n")).toMatchObject({ kind: "link", mutual: true });
    expect(find("v", "w")).toMatchObject({ mutual: false });
    expect(edges.filter((e) => [e.a, e.b].sort().join() === "n,v").length).toBe(1);
  });
  it("verbindet Unterseiten mit ihrer Oberseite", () => {
    expect(find("v", "s")).toMatchObject({ kind: "child", a: "v", b: "s" });
  });
  it("lässt Seiten ohne Verbindung außen vor", () => {
    expect(edges.some((e) => e.a === "x" || e.b === "x")).toBe(false);
    expect(buildLinkEdges([])).toEqual([]);
  });
});
