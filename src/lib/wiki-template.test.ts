import { describe, expect, it } from "vitest";
import { missingPublicRows, missingSecretRows, parseTemplate } from "./wiki-template";

describe("wiki-template", () => {
  it("liest die Vorlage, entfernt Doppelte und Leere", () => {
    const out = parseTemplate(JSON.stringify([{ title: "Beruf" }, { title: " beruf " }, { title: "Beruf", secret: true }, { title: "" }, 7]));
    expect(out).toEqual([
      { icon: "", title: "Beruf", secret: false },
      { icon: "", title: "beruf", secret: false },
      { icon: "", title: "Beruf", secret: true },
    ].filter((_, i) => i !== 1));
  });
  it("ergänzt nur fehlende Zeilen", () => {
    const t = parseTemplate([{ title: "Beruf" }, { title: "Wohnort" }, { title: "Geheimnis", secret: true }]);
    expect(missingPublicRows(t, [{ icon: "", title: "beruf", text: "Arzt" }])).toEqual([{ icon: "", title: "Wohnort", text: "" }]);
    expect(missingSecretRows(t, [])).toEqual([{ icon: "", title: "Geheimnis", text: "", shared_with: [] }]);
  });
});
