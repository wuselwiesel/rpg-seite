import { describe, expect, it } from "vitest";
import { parseProfileFields } from "./profile-fields";

function form(entries: [string, string][]) {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

describe("parseProfileFields", () => {
  it("liest öffentliche und geheime Felder getrennt", () => {
    const f = form([
      ["field_icon", "🙂"], ["field_title", "Alter"], ["field_text", "22"],
      ["secret_field_icon", ""], ["secret_field_title", "Geheimnis"], ["secret_field_text", "Ist ein Vampir"],
    ]);
    expect(parseProfileFields(f)).toEqual([{ icon: "🙂", title: "Alter", text: "22" }]);
    expect(parseProfileFields(f, "secret_")).toEqual([{ icon: "", title: "Geheimnis", text: "Ist ein Vampir" }]);
  });
  it("lässt unvollständige Zeilen weg", () => {
    expect(parseProfileFields(form([["field_icon", ""], ["field_title", "Nur Titel"], ["field_text", ""]]))).toEqual([]);
  });
});
