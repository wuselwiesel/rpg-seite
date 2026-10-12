import { describe, expect, it } from "vitest";
import { parseInviteLink } from "./invite-link";

const id = "4a7afa6c-d110-42b5-8bc2-1b995ec6aca4";

describe("Einladungslink", () => {
  it("erkennt vollständige Links", () => {
    expect(parseInviteLink(`https://rpg-seite.vercel.app/worlds/join/${id}`)).toBe(id);
    expect(parseInviteLink(`  /worlds/join/${id}?x=1 `)).toBe(id);
  });
  it("erkennt eine Weltseite und eine nackte Nummer", () => {
    expect(parseInviteLink(`https://x.de/worlds/${id}`)).toBe(id);
    expect(parseInviteLink(id.toUpperCase())).toBe(id);
  });
  it("lehnt anderes ab", () => {
    expect(parseInviteLink("hallo")).toBeNull();
    expect(parseInviteLink("https://x.de/wiki/" + id)).toBeNull();
  });
});
