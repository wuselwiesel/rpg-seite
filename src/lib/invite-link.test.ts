import { describe, expect, it } from "vitest";
import { parseInviteLink, parseInviteToken } from "./invite-link";

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

describe("Einladungs-Schlüssel", () => {
  const token = "0123456789abcdef0123456789abcdef";
  it("liest den Schlüssel aus dem Link", () => {
    expect(parseInviteToken(`https://x.de/worlds/join/${id}?t=${token}`)).toBe(token);
    expect(parseInviteToken(`/worlds/join/${id}?a=1&t=${token.toUpperCase()}#x`)).toBe(token);
  });
  it("gibt ohne Schlüssel null zurück", () => {
    expect(parseInviteToken(`https://x.de/worlds/join/${id}`)).toBeNull();
    expect(parseInviteToken(`?t=zu-kurz`)).toBeNull();
  });
});
