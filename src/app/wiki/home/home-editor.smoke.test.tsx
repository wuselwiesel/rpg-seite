import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("../home-actions", () => ({ saveWikiHome: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/rich-text-editor", () => ({ RichTextEditor: () => <div>editor</div> }));
vi.mock("@/components/avatar-upload", () => ({ AvatarUpload: () => <div>upload</div> }));

import { HomeEditor } from "./home-editor";
import { defaultHome, newBlock } from "@/lib/wiki-home";

describe("Wiki-Startseite: Editor", () => {
  it("rendert Bausteine, Auswahl zum Hinzufügen und Entfernen", () => {
    const html = renderToString(
      <HomeEditor worldId="w" initial={{ blocks: [...defaultHome().blocks, newBlock("text"), newBlock("tiles")] }} hasHome options={[{ kind: "page", id: "p1", title: "Hauptstadt" }]} />,
    );
    expect(html).toContain("Titelbild");
    expect(html).toContain("Schnellzugriffe");
    expect(html).toContain("Hauptstadt");
    expect(html).toContain("Startseite entfernen");
    expect(html).toContain("Speichern");
  });
});
