import { describe, expect, it } from "vitest";
import { sanitizePostHtmlCore as clean } from "./sanitize-core";

describe("Textbausteine bleiben erhalten", () => {
  it("Hinweis-Kasten mit bekannter Art", () => {
    expect(clean('<div data-callout="achtung"><p>Vorsicht</p></div>')).toBe('<div data-callout="achtung"><p>Vorsicht</p></div>');
  });
  it("unbekannte Art und fremde Attribute werden entfernt", () => {
    expect(clean('<div data-callout="x\\" onclick=\\"a" class="big" style="color:red"><p>t</p></div>')).toBe("<div><p>t</p></div>");
  });
  it("Spoiler mit Inhalt", () => {
    const html = '<details><summary>Mehr</summary><div data-type="detailsContent"><p>Geheim</p></div></details>';
    expect(clean(html)).toBe(html);
    expect(clean('<details open onclick="x"><summary>a</summary></details>')).toBe("<details open><summary>a</summary></details>");
  });
  it("Tabelle mit Kopfzeile und verbundenen Zellen", () => {
    const html = '<table><tbody><tr><th colspan="2">Kopf</th></tr><tr><td>a</td><td rowspan="3">b</td></tr></tbody></table>';
    expect(clean(html)).toBe(html);
  });
  it("Tiptap-Hilfen (Spaltengruppen, Breiten, Stil) fallen weg, die Tabelle bleibt", () => {
    const html = '<table style="min-width: 75px;"><colgroup><col style="min-width: 25px;"></colgroup><tbody><tr><td><p>x</p></td></tr></tbody></table>';
    expect(clean(html)).toBe("<table><tbody><tr><td><p>x</p></td></tr></tbody></table>");
  });
  it("Zellen-Spannen werden begrenzt und müssen Zahlen sein", () => {
    expect(clean('<table><tbody><tr><td colspan="999" rowspan="abc">x</td></tr></tbody></table>')).toBe("<table><tbody><tr><td>x</td></tr></tbody></table>");
  });
});

describe("Gefährliches bleibt draußen", () => {
  it("Skripte, Frames, Ereignisse und javascript:-Links", () => {
    expect(clean('<p onclick="x()">a</p><script>alert(1)</script><iframe src="https://x"></iframe>')).toBe("<p>a</p>");
    expect(clean('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
  });
  it("bisheriges Verhalten: Erwähnungen und Schriftart", () => {
    const html = '<span data-type="mention" data-id="11111111-1111-4111-8111-111111111111" class="mention">@A</span>';
    expect(clean(html)).toBe(html);
    expect(clean('<span style="font-family: var(--font-lora), serif; color: red">a</span>')).toBe('<span style="font-family:var(--font-lora), serif">a</span>');
  });
});
