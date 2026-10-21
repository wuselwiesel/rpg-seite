import { describe, expect, it } from "vitest";
import { parseSystemMessage, systemMessageText } from "./system-message";

describe("system-message", () => {
  it("erkennt Systemzeilen und gibt den Text zurück", () => {
    expect(parseSystemMessage(systemMessageText("Mia wurde hinzugefügt"))).toBe("Mia wurde hinzugefügt");
  });
  it("lässt normale Nachrichten in Ruhe", () => {
    expect(parseSystemMessage("Hallo")).toBeNull();
  });
});
