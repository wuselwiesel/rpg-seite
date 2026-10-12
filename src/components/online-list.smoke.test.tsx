import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

const state = { enabled: true, onlineIds: new Set<string>(), looks: new Map<string, { emoji: string | null; text: string | null; writing?: boolean }>() };
vi.mock("@/components/online-status", () => ({ useOnline: () => state }));

import { OnlineList } from "./online-list";
import { SidebarOnline } from "./sidebar-online";

const members = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => ({ id, name: `Person ${id}`, avatarUrl: null }));

describe("Online-Liste", () => {
  it("zeigt, wer online ist, ohne dich selbst; mit Status und Schreib-Anzeige", () => {
    state.onlineIds = new Set(["a", "b", "me"]);
    state.looks = new Map([["a", { emoji: "🌙", text: "Nachtschicht", writing: true }]]);
    const html = renderToString(<OnlineList members={[...members, { id: "me", name: "Ich", avatarUrl: null }]} selfId="me" />);
    expect(html).toContain("Person a");
    expect(html).toContain("Person b");
    expect(html).not.toContain("Ich<");
    expect(html).toContain("Nachtschicht");
    expect(html).toContain("schreibt gerade");
    expect(html).toContain("/redaktion/chat/mit/a");
    expect(html).not.toContain("Person c");
  });
  it("ab 7 Personen: „+ n weitere“", () => {
    state.onlineIds = new Set(members.map((m) => m.id));
    state.looks = new Map();
    const html = renderToString(<OnlineList members={members} selfId="me" />);
    expect(html.replace(/<!-- -->/g, "")).toContain("+ 2 weitere");
  });
  it("niemand online: leiser Hinweis, Seitenleiste bleibt", () => {
    state.onlineIds = new Set();
    expect(renderToString(<OnlineList members={members} selfId="me" />)).toContain("Niemand online");
    expect(renderToString(<SidebarOnline members={members} selfId="me" />)).toContain("Online");
  });
});
