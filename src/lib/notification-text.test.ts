import { describe, expect, it } from "vitest";
import { notificationText } from "./notification-text";

describe("notificationText", () => {
  it("einzelne Meldung unverändert", () => {
    expect(notificationText("Mira", 1, "hat deinen Beitrag kommentiert")).toBe("Mira hat deinen Beitrag kommentiert");
    expect(notificationText(null, undefined, "gefällt dein Beitrag")).toBe("Jemand gefällt dein Beitrag");
  });

  it("gebündelte Meldung mit Verb im Plural", () => {
    expect(notificationText("Mira", 5, "hat deinen Beitrag kommentiert")).toBe("Mira und 4 weitere haben deinen Beitrag kommentiert");
    expect(notificationText("Mira", 2, "gefällt dein Beitrag")).toBe("Mira und 1 weitere Person gefallen dein Beitrag");
  });
});
