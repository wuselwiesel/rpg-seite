import { describe, expect, it } from "vitest";
import { applySpeakers, parseSpeakerIds } from "./speakers";

const F = { id: "11111111-1111-4111-8111-111111111111", name: "Felicity Barnes", username: "felicity" };
const N = { id: "22222222-2222-4222-8222-222222222222", name: "Nicholas Finch", username: "nick.finch" };
const N2 = { id: "33333333-3333-4333-8333-333333333333", name: "Nicholas Hart", username: null };

describe("applySpeakers", () => {
  it("macht aus Zeilen mit Vornamen Absätze mit Sprecher", () => {
    const r = applySpeakers('<p>Felicity: Sie ging die Treppen runter. "Hallo?"</p><p>Nicholas: Er sah zu ihr auf.</p>', [F, N]);
    expect(r.speakerIds).toEqual([F.id, N.id]);
    expect(r.html).toBe(
      `<p><span data-type="speaker" data-id="${F.id}" class="speaker">Felicity Barnes:</span> Sie ging die Treppen runter. "Hallo?"</p>` +
        `<p><span data-type="speaker" data-id="${N.id}" class="speaker">Nicholas Finch:</span> Er sah zu ihr auf.</p>`,
    );
  });
  it("erkennt Benutzernamen und trennt Zeilen mit Umbruch", () => {
    const r = applySpeakers("<p>felicity: Hallo?<br>nick.finch: Hey</p>", [F, N]);
    expect(r.speakerIds).toEqual([F.id, N.id]);
    expect(r.html.match(/<p>/g)?.length).toBe(2);
  });
  it("lässt Text ohne Sprecherzeile unverändert", () => {
    const html = "<p>Hallo: so ist das nicht gemeint.</p>";
    expect(applySpeakers(html, [F, N])).toEqual({ html, speakerIds: [] });
  });
  it("nimmt keine mehrdeutigen Vornamen", () => {
    expect(applySpeakers("<p>Nicholas: Hi</p>", [N, N2]).speakerIds).toEqual([]);
    expect(applySpeakers("<p>Nicholas Hart: Hi</p>", [N, N2]).speakerIds).toEqual([N2.id]);
  });
  it("behält Zeilen ohne Namen als eigenen Absatz", () => {
    const r = applySpeakers("<p>Es war still.</p><p>Felicity: Hallo?</p>", [F]);
    expect(r.html.startsWith("<p>Es war still.</p>")).toBe(true);
  });
  it("ist idempotent und kann gespeicherte Sprecher erneut lesen", () => {
    const first = applySpeakers("<p>Felicity: Hallo?</p>", [F]).html;
    expect(applySpeakers(first, [F]).html).toBe(first);
    expect(parseSpeakerIds(first)).toEqual([F.id]);
  });
  it("lässt Listen und Bilder in Ruhe", () => {
    const html = "<ul><li>Felicity: Hallo</li></ul>";
    expect(applySpeakers(html, [F]).html).toBe(html);
  });
});
