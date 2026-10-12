import { describe, expect, it } from "vitest";
import { parseWorldLink, worldSwitchHref } from "./link-world";

const ID = "a70ddcbf-f8cc-4d70-94ea-ef6de3c60e4e";

describe("parseWorldLink", () => {
  it("erkennt Szenen, Beiträge, Charaktere, Wiki und Welten", () => {
    expect(parseWorldLink(`/story/${ID}`)).toEqual({ kind: "story", id: ID });
    expect(parseWorldLink(`/story/${ID}?ziel=ende`)).toEqual({ kind: "story", id: ID });
    expect(parseWorldLink(`/posts/${ID}`)).toEqual({ kind: "posts", id: ID });
    expect(parseWorldLink(`/characters/${ID}`)).toEqual({ kind: "characters", id: ID });
    expect(parseWorldLink(`/wiki/${ID}`)).toEqual({ kind: "wiki", id: ID });
    expect(parseWorldLink(`/worlds/${ID}`)).toEqual({ kind: "worlds", id: ID });
  });

  it("lässt weltübergreifende Links in Ruhe", () => {
    expect(parseWorldLink("/friends")).toBeNull();
    expect(parseWorldLink(`/chats/${ID}`)).toBeNull();
    expect(parseWorldLink("/story/test")).toBeNull();
    expect(parseWorldLink(`/storyx/${ID}`)).toBeNull();
  });
});

describe("worldSwitchHref", () => {
  it("packt Ziel und Welt in die Weiterleitung", () => {
    expect(worldSwitchHref(ID, `/story/${ID}?ziel=ende`)).toBe(`/switch-world?next=${encodeURIComponent(`/story/${ID}?ziel=ende`)}&world=${ID}`);
    expect(worldSwitchHref(null, "/posts/x")).toBe("/switch-world?next=%2Fposts%2Fx");
  });
});
