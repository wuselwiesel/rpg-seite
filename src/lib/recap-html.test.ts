import { describe, expect, it } from "vitest";
import { isEmptyRecap, recapToHtml } from "./recap-html";

describe("recap-html", () => {
  it("macht aus reinem Text Absätze und lässt HTML unverändert", () => {
    expect(recapToHtml("Eins\nZwei & drei")).toBe("<p>Eins</p><p>Zwei &amp; drei</p>");
    expect(recapToHtml("<p>Schon <strong>fett</strong></p>")).toBe("<p>Schon <strong>fett</strong></p>");
    expect(recapToHtml(null)).toBe("");
  });
  it("erkennt leere Zusammenfassungen", () => {
    expect(isEmptyRecap("<p></p>")).toBe(true);
    expect(isEmptyRecap("<p>&nbsp;</p>")).toBe(true);
    expect(isEmptyRecap("<p>Text</p>")).toBe(false);
    expect(isEmptyRecap('<p><img src="x"></p>')).toBe(false);
  });
});
