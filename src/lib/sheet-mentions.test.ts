import { describe, expect, it } from "vitest";
import { insertMention, matchTargets, mentionQuery, splitMentions, stripMentionAt, withoutAt } from "./sheet-mentions";

const chars = [
  { id: "1", name: "Mira" },
  { id: "2", name: "Mira Salz" },
  { id: "3", name: "Kai-Ole" },
  { id: "4", name: "Lyra Nachtfeder" },
];

describe("splitMentions", () => {
  it("ohne @ bleibt der Text ganz", () => {
    expect(splitMentions("Mutter", chars)).toEqual([{ kind: "text", text: "Mutter" }]);
  });
  it("erkennt einen Namen und lässt den Rest als Text", () => {
    const p = splitMentions("Schwester von @Lyra Nachtfeder, ledig", chars);
    expect(p.map((x) => x.kind)).toEqual(["text", "mention", "text"]);
    expect(p[1]).toMatchObject({ kind: "mention", target: { id: "4" }, text: "@Lyra Nachtfeder" });
    expect(p[2]).toMatchObject({ text: ", ledig" });
  });
  it("nimmt den längsten passenden Namen", () => {
    const p = splitMentions("@Mira Salz", chars);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ kind: "mention", target: { id: "2" } });
  });
  it("kurzer Name, wenn der lange nicht passt", () => {
    const p = splitMentions("@Mira und @Kai-Ole", chars);
    expect(p.filter((x) => x.kind === "mention").map((x) => (x.kind === "mention" ? x.target.id : ""))).toEqual(["1", "3"]);
  });
  it("Groß-/Kleinschreibung egal, aber kein Treffer mitten im Wort", () => {
    expect(splitMentions("@mira", chars)[0]).toMatchObject({ kind: "mention", target: { id: "1" } });
    expect(splitMentions("@Miranda", chars)).toEqual([{ kind: "text", text: "@Miranda" }]);
  });
  it("unbekannter Name bleibt Text", () => {
    expect(splitMentions("@Niemand", chars)).toEqual([{ kind: "text", text: "@Niemand" }]);
  });
  it("Sonderzeichen im Namen brechen die Suche nicht", () => {
    expect(splitMentions("@A.B (x)", [{ id: "9", name: "A.B (x)" }])[0]).toMatchObject({ kind: "mention" });
  });
});

describe("mentionQuery", () => {
  it("findet die Suche hinter dem @", () => {
    expect(mentionQuery("Mutter @Mi", 10)).toEqual({ start: 7, query: "Mi" });
    expect(mentionQuery("@", 1)).toEqual({ start: 0, query: "" });
  });
  it("kein @ oder E-Mail-ähnlich: keine Suche", () => {
    expect(mentionQuery("Mutter", 6)).toBeNull();
    expect(mentionQuery("name@mail", 9)).toBeNull();
    expect(mentionQuery("@Mira und", 9)).toBeNull();
  });
});

describe("matchTargets", () => {
  it("Anfang des Namens zuerst, dann Wortanfang, dann enthalten", () => {
    expect(matchTargets(chars, "na").map((c) => c.name)).toEqual(["Lyra Nachtfeder"]);
    expect(matchTargets(chars, "mi").map((c) => c.name)).toEqual(["Mira", "Mira Salz"]);
    expect(matchTargets(chars, "ole").map((c) => c.name)).toEqual(["Kai-Ole"]);
  });
  it("leere Suche zeigt alle (begrenzt)", () => {
    expect(matchTargets(chars, "", 2)).toHaveLength(2);
  });
});

describe("insertMention", () => {
  it("ersetzt @abc durch @Name und setzt den Cursor dahinter", () => {
    expect(insertMention("Mutter @Mi", 10, 7, "Mira Salz")).toEqual({ text: "Mutter @Mira Salz ", caret: 18 });
  });
  it("lässt Text nach dem Cursor stehen", () => {
    const r = insertMention("@M, Vater", 2, 0, "Mira");
    expect(r.text).toBe("@Mira , Vater");
  });
});

describe("Anzeige ohne @", () => {
  it("withoutAt nimmt nur ein führendes @ weg", () => {
    expect(withoutAt("@Mira Salz")).toBe("Mira Salz");
    expect(withoutAt("Mira")).toBe("Mira");
  });
  it("stripMentionAt entfernt das @ in Erwähnungen von Notizen, sonst nichts", () => {
    const html = '<p>Freund von <span class="mention" data-type="mention" data-id="1">@Mira</span> (mail@x.de)</p>';
    expect(stripMentionAt(html)).toBe('<p>Freund von <span class="mention" data-type="mention" data-id="1">Mira</span> (mail@x.de)</p>');
    expect(stripMentionAt("<p>kein @Name hier</p>")).toBe("<p>kein @Name hier</p>");
  });
});
