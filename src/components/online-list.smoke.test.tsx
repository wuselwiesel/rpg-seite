import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

const state = { enabled: true, onlineIds: new Set<string>(), looks: new Map<string, { emoji: string | null; text: string | null; writing?: boolean }>() };
vi.mock("@/components/online-status", () => ({ useOnline: () => state }));

import { MemberList } from "./online-list";
import { SidebarOnline } from "./sidebar-online";

const members = [
  { id: "a", name: "Hörnchen", avatarUrl: null, role: "owner" as const },
  { id: "b", name: "Kirschplunder", avatarUrl: null, role: "admin" as const },
  { id: "c", name: "Luna", avatarUrl: null, role: "member" as const },
  { id: "me", name: "Ich", avatarUrl: null, role: "member" as const },
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
    expect(html).toContain("(du)");
  });
  it("niemand online: keine Online-Gruppe und kein „Niemand online“", () => {
    state.onlineIds = new Set();
    state.looks = new Map();
    const html = text(renderToString(<MemberList members={members} selfId="me" />));
    expect(html).not.toContain("Online —");
    expect(html).not.toContain("Niemand online");
    expect(html).toContain("Offline — 4");
  });
  it("nach Rolle gruppiert", () => {
    state.onlineIds = new Set(["c"]);
    const html = text(renderToString(<MemberList members={members} selfId="me" mode="role" />));
    expect(html).toContain("Besitzer:in — 1");
    expect(html).toContain("Admin — 1");
    expect(html).toContain("Mitglied — 2");
  });
  it("Seitenleiste zeigt die Gesamtzahl", () => {
    expect(text(renderToString(<SidebarOnline members={members} selfId="me" />))).toContain("Mitglieder — 4");
  });
});
