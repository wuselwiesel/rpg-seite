import { describe, expect, it } from "vitest";
import { isNavActive, navItems, shortName } from "./nav-model";

const lyra = { activeCharacter: { id: "c1", name: "Lyra Nachtfeder" } };
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("navItems", () => {
  it("Ingame und Story teilen die Leiste, nur der erste Eintrag wechselt", () => {
    expect(ids(navItems("ingame", lyra))).toEqual(["feed", "welt", "chats", "character"]);
    expect(ids(navItems("story", lyra))).toEqual(["story", "welt", "chats", "character"]);
  });
  it("Redaktion hat eine eigene Leiste", () => {
    expect(navItems("redaktion", lyra).map((x) => x.label)).toEqual(["Neuigkeiten", "Chat", "Feedback", "Du"]);
  });
  it("der Charakter-Eintrag zeigt den Kurznamen und führt zum Profil", () => {
    const c = navItems("ingame", lyra).at(-1)!;
    expect(c.label).toBe("Lyra");
    expect(c.href).toBe("/characters/c1");
  });
  it("ohne Charakter führt der Eintrag zum Anlegen", () => {
    const c = navItems("story", { activeCharacter: null }).at(-1)!;
    expect(c.href).toBe("/characters/new");
    expect(c.label).toBe("Charakter");
  });
});

describe("isNavActive", () => {
  const [feed, welt, chats] = navItems("ingame", lyra);
  const [story] = navItems("story", lyra);
  it("Feed nur auf der Startseite", () => {
    expect(isNavActive(feed, "/")).toBe(true);
    expect(isNavActive(feed, "/posts/abc")).toBe(false);
  });
  it("Welt umfasst die Seiten hinter den Kacheln", () => {
    for (const p of ["/welt", "/wiki", "/wiki/karten", "/characters/relationships", "/story/wuerfe", "/story/charaktere"]) expect(isNavActive(welt, p)).toBe(true);
    expect(isNavActive(welt, "/story")).toBe(false);
  });
  it("Story zählt Würfelverlauf und Charaktere nicht mit", () => {
    expect(isNavActive(story, "/story")).toBe(true);
    expect(isNavActive(story, "/story/abc")).toBe(true);
    expect(isNavActive(story, "/story/wuerfe")).toBe(false);
    expect(isNavActive(story, "/story/charaktere")).toBe(false);
  });
  it("Chats auch im einzelnen Chat", () => {
    expect(isNavActive(chats, "/chats/x")).toBe(true);
    expect(isNavActive(chats, null)).toBe(false);
  });
  it("Du umfasst Spielerprofil und Änderungsverlauf", () => {
    const du = navItems("redaktion", lyra).at(-1)!;
    expect(isNavActive(du, "/redaktion/profil/u1")).toBe(true);
    expect(isNavActive(du, "/redaktion/verlauf")).toBe(true);
    expect(isNavActive(du, "/redaktion")).toBe(false);
  });
});

describe("shortName", () => {
  it("nimmt den ersten Teil", () => {
    expect(shortName("Lyra Nachtfeder")).toBe("Lyra");
    expect(shortName("  Ivy  ")).toBe("Ivy");
  });
});
