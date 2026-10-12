import { describe, expect, it } from "vitest";
import { parseWikiShare, wikiShareText } from "./wiki-share";

describe("Wiki-Seite im Chat", () => {
  const id = "4a7afa6c-d110-42b5-8bc2-1b995ec6aca4";
  it("erkennt eine geteilte Seite", () => {
    const text = wikiShareText("Dana Grey", `https://rpg-seite.vercel.app/wiki/${id}`);
    expect(parseWikiShare(text)).toEqual({ title: "Dana Grey", pageId: id });
  });
  it("braucht den Link in der letzten Zeile", () => {
    expect(parseWikiShare(`schau mal https://x.de/wiki/${id}\nund so`)).toBeNull();
    expect(parseWikiShare("kein Link")).toBeNull();
  });
  it("Titel ohne Zeichen bekommt einen Ersatz", () => {
    expect(parseWikiShare(`https://x.de/wiki/${id}`)?.title).toBe("Wiki-Seite");
  });
});
