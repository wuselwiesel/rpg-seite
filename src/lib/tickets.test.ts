import { describe, expect, it } from "vitest";
import { deviceSummary, isUnread, pathFromReferrer, statusMessage, ticketAsTask, ticketNumber } from "./tickets";

describe("tickets", () => {
  it("fasst das Gerät in einer Zeile zusammen", () => {
    const s = deviceSummary({ userAgent: "Mozilla/5.0  (Linux)", width: 375.4, height: 700, touch: true, dark: true });
    expect(s).toBe("Mozilla/5.0 (Linux) · 375×700 · Touch · dunkel");
    expect(deviceSummary({ userAgent: "x".repeat(900), width: 1, height: 1, touch: false, dark: false }).length).toBe(400);
  });

  it("nimmt nur Seiten der eigenen Seite als Herkunft", () => {
    expect(pathFromReferrer("https://w.example/story/abc?x=1", "https://w.example")).toBe("/story/abc?x=1");
    expect(pathFromReferrer("https://w.example", "https://w.example")).toBe("/");
    expect(pathFromReferrer("https://anders.example/story", "https://w.example")).toBe("");
    expect(pathFromReferrer("https://w.example/profile/meldungen", "https://w.example")).toBe("");
    expect(pathFromReferrer("", "https://w.example")).toBe("");
  });

  it("macht aus einer Meldung einen Aufgabentext", () => {
    const text = ticketAsTask({ kind: "bug", title: "Bild verschmilzt", body: " Zwei Figuren \n", page_path: "/story/1", device: "Handy", by: "Mira" });
    expect(text).toBe("Fehler: Bild verschmilzt\n\nZwei Figuren\n\nVon: Mira\nSeite: /story/1\nGerät: Handy");
    expect(ticketAsTask({ kind: "wish", title: "Dunkelmodus", body: "", page_path: null, device: null })).toBe("Wunsch: Dunkelmodus");
  });

  it("schreibt die Nummer wie in einem Postfach", () => {
    expect(ticketNumber(12)).toBe("#12");
    expect(ticketAsTask({ kind: "bug", title: "T", body: "", page_path: null, device: null, number: 7 })).toBe("#7 Fehler: T");
    expect(statusMessage("done", "T", 7)).toBe("hat deine Meldung erledigt: #7 T");
  });

  it("erkennt ungelesene Tickets", () => {
    const t = { last_actor: "admin", updated_at: "2026-10-17T10:00:00Z" };
    expect(isUnread(t, "me", null)).toBe(true);
    expect(isUnread(t, "me", "2026-10-17T09:00:00Z")).toBe(true);
    expect(isUnread(t, "me", "2026-10-17T10:00:00Z")).toBe(false);
    expect(isUnread({ ...t, last_actor: "me" }, "me", null)).toBe(false);
  });

  it("formuliert die Benachrichtigung je Status", () => {
    expect(statusMessage("done", "Titel")).toBe("hat deine Meldung erledigt: Titel");
    expect(statusMessage("working", "T")).toContain("bearbeitet");
  });
});
