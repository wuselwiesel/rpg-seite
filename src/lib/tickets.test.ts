import { describe, expect, it } from "vitest";
import { categoryFromPath, deviceShort, deviceSummary, groupOf, isUnread, matchesQuery, shortWhen, sortTickets, pathFromReferrer, statusMessage, ticketAsTask, ticketNumber } from "./tickets";

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

  it("schlägt die Kategorie aus der Seite vor", () => {
    expect(categoryFromPath("/story/abc?x=1")).toBe("scene");
    expect(categoryFromPath("/wiki/besetzung")).toBe("cast");
    expect(categoryFromPath("/wiki/seite/1")).toBe("wiki");
    expect(categoryFromPath("/chats/1")).toBe("chat");
    expect(categoryFromPath("/redaktion/chat/1")).toBe("chat");
    expect(categoryFromPath("/worlds/abc/charaktere")).toBe("character");
    expect(categoryFromPath("/profile/konto")).toBe("settings");
    expect(categoryFromPath("/")).toBe("feed");
    expect(categoryFromPath("/hilfe")).toBeNull();
    expect(categoryFromPath("")).toBeNull();
  });

  it("gruppiert nach Stand und sortiert Dringendes nach oben", () => {
    expect(groupOf("open")).toBe("open");
    expect(groupOf("working")).toBe("working");
    expect(groupOf("done")).toBe("closed");
    expect(groupOf("declined")).toBe("closed");
    const list = [
      { id: "a", urgent: false, updated_at: "2026-10-18T10:00:00Z" },
      { id: "b", urgent: true, updated_at: "2026-10-01T10:00:00Z" },
      { id: "c", urgent: false, updated_at: "2026-10-19T10:00:00Z" },
    ];
    expect(sortTickets(list).map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("sucht in Nummer, Titel, Melder:in, Art und Kategorie", () => {
    const t = { number: 14, title: "Würfel zeigt falschen Wert", by: "Sani", kind: "bug" as const, category: "scene" as const };
    expect(matchesQuery(t, "")).toBe(true);
    expect(matchesQuery(t, "#14")).toBe(true);
    expect(matchesQuery(t, "würfel")).toBe(true);
    expect(matchesQuery(t, "sani")).toBe(true);
    expect(matchesQuery(t, "fehler")).toBe(true);
    expect(matchesQuery(t, "szene")).toBe(true);
    expect(matchesQuery(t, "wiki")).toBe(false);
  });

  it("zeigt die Zeit kurz", () => {
    const now = new Date(2026, 9, 18, 15, 0);
    expect(shortWhen(new Date(2026, 9, 18, 9, 5).toISOString(), now)).toBe("09:05");
    expect(shortWhen(new Date(2026, 9, 17, 23, 0).toISOString(), now)).toBe("Gestern");
    expect(shortWhen(new Date(2026, 9, 1, 12, 0).toISOString(), now)).toMatch(/1\.? Okt/);
  });

  it("kürzt die Geräteangabe", () => {
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 · 375×700 · Touch · dunkel";
    expect(deviceShort(iphone)).toBe("iPhone, Safari, 375×700, Touch, dunkel");
    expect(deviceShort("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0 Safari/537.36 · 1280×800 · Maus · hell")).toBe("Mac, Chrome, 1280×800, Maus, hell");
    expect(deviceShort(null)).toBe("");
  });
});
