import { describe, expect, it } from "vitest";
import { bucketSize, timelineSections } from "./timeline";

const at = (year: number, name = String(year)) => ({ name, dates: { start: { year, month: null, day: null }, end: null } });

describe("bucketSize", () => {
  it("teilt kurze Zeiträume nicht auf", () => expect(bucketSize(1400, 1430)).toBe(0));
  it("nimmt Jahrzehnte bei mittleren Zeiträumen", () => expect(bucketSize(1400, 1480)).toBe(10));
  it("nimmt Jahrhunderte bei langen Zeiträumen", () => expect(bucketSize(1000, 1432)).toBe(100));
});

describe("timelineSections", () => {
  it("liefert nichts ohne Einträge", () => expect(timelineSections([])).toEqual([]));

  it("ein Abschnitt ohne Titel bei kurzem Zeitraum", () => {
    const s = timelineSections([at(1432), at(1430), at(1432, "b")]);
    expect(s).toHaveLength(1);
    expect(s[0].label).toBeNull();
    expect(s[0].years.map((y) => y.year)).toEqual([1430, 1432]);
    expect(s[0].years[1].items).toHaveLength(2);
  });

  it("Jahrhunderte, nur belegte Abschnitte", () => {
    const s = timelineSections([at(1432), at(1050), at(1099), at(1460)]);
    expect(s.map((x) => x.label)).toEqual(["1000 bis 1099", "1400 bis 1499"]);
    expect(s[0].years.map((y) => y.year)).toEqual([1050, 1099]);
  });

  it("negative Jahre rutschen in den richtigen Abschnitt", () => {
    const s = timelineSections([at(-5), at(-120), at(300)]);
    expect(s.map((x) => x.label)).toEqual(["-200 bis -101", "-100 bis -1", "300 bis 399"]);
  });
});
