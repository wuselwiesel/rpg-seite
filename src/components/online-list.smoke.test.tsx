import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

const state = { enabled: true, onlineIds: new Set<string>(), looks: new Map<string, { emoji: string | null; text: string | null; writing?: boolean }>(), own: { emoji: null, text: null }, setLook: () => {} };
vi.mock("@/components/online-status", () => ({ useOnline: () => state, OnlineToggle: () => <div>toggle</div> }));
vi.mock("@/app/profile/actions", () => ({ setPresenceStatus: vi.fn() }));

import { MemberList } from "./online-list";
import { SidebarOnline } from "./sidebar-online";

const members = [
  { id: "a", name: "Hörnchen", avatarUrl: null },
  { id: "b", name: "Kirschplunder", avatarUrl: null },
  { id: "c", name: "Luna", avatarUrl: null },
  { id: "me", name: "Ich", avatarUrl: null },
];
const text = (html: string) => html.replace(/<!-- -->/g, "");

describe("Mitgliederliste", () => {
  it("gruppiert in Online und Offline, mit Status und Schreib-Anzeige", () => {
    state.onlineIds = new Set(["a", "b"]);
    state.looks = new Map([["a", { emoji: null, text: null, writing: true }], ["b", { emoji: "🌙", text: "Nachtschicht" }]]);
    const html = text(renderToString(<MemberList members={members} selfId="me" />));
    expect(html).toContain("Online — 2");
    expect(html).toContain("Offline — 2");
    expect(html).toContain("Hörnchen");
    expect(html).toContain("Nachtschicht");
    expect(html).toContain("schreibt gerade");
    expect(html).not.toContain("(du)");
    expect(html).not.toContain("Status festlegen");
  });
  it("niemand online: keine Online-Gruppe und kein „Niemand online“", () => {
    state.onlineIds = new Set();
    state.looks = new Map();
    const html = text(renderToString(<MemberList members={members} selfId="me" />));
    expect(html).not.toContain("Online —");
    expect(html).not.toContain("Niemand online");
    expect(html).toContain("Offline — 4");
  });
  it("Seitenleiste hat keine auffällige Überschrift", () => {
    const html = text(renderToString(<SidebarOnline members={members} selfId="me" />));
    expect(html).not.toContain("Mitglieder —");
    expect(html).toContain("Mitgliederliste zuklappen");
    expect(html).toContain("Offline — 4");
  });
});
