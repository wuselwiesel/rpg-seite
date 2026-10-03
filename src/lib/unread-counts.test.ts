import { describe, expect, it } from "vitest";
import { computeUnreadCounts, type ChatWithMessages } from "./unread-counts";

const chat = (id: string, participants: string[], messages: [string, string][]): ChatWithMessages => ({
  id,
  chat_participants: participants.map((character_id) => ({ character_id })),
  messages: messages.map(([created_at, character_id]) => ({ created_at, character_id })),
});

describe("computeUnreadCounts", () => {
  const lucian = "lucian";
  const emilie = "emilie"; // zweiter eigener Charakter
  const fremd = "fremd";
  const chats = [
    chat("c1", [lucian, fremd], [["2026-01-02T10:00:00Z", fremd], ["2026-01-02T11:00:00Z", fremd], ["2026-01-02T12:00:00Z", lucian]]),
    chat("c2", [emilie, fremd], [["2026-01-02T10:00:00Z", fremd], ["2026-01-02T10:30:00Z", fremd], ["2026-01-02T10:45:00Z", fremd]]),
    chat("c3", [lucian, emilie], [["2026-01-02T09:00:00Z", lucian], ["2026-01-02T09:05:00Z", lucian]]),
  ];

  it("zählt aus Sicht des aktiven Charakters nur dessen Chats und fremde Nachrichten", () => {
    expect(computeUnreadCounts(chats, [], [lucian, emilie], lucian)).toEqual({ c1: 2 });
  });

  it("aus Sicht aller eigenen Charaktere kommen die Chats der anderen dazu (der Grund für zu hohe Zähler)", () => {
    expect(computeUnreadCounts(chats, [], [lucian, emilie])).toEqual({ c1: 2, c2: 3, c3: 2 });
  });

  it("berücksichtigt den Lesezeitpunkt", () => {
    const reads = [{ chat_id: "c1", last_read_at: "2026-01-02T10:30:00Z" }];
    expect(computeUnreadCounts(chats, reads, [lucian, emilie], lucian)).toEqual({ c1: 1 });
  });

  it("eigene Nachrichten sind für den Schreibenden nie ungelesen", () => {
    expect(computeUnreadCounts([chats[0]], [], [lucian], lucian).c1).toBe(2);
    expect(computeUnreadCounts([chat("x", [lucian, fremd], [["2026-01-03T10:00:00Z", lucian]])], [], [lucian], lucian)).toEqual({});
  });
});
