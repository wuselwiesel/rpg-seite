import { Node } from "@tiptap/core";

// Dateianhang in einer Notiz (privater Speicher): Block mit Dateiname, der über /notizen/datei einen kurzlebigen Link öffnet.
// Gespeichert als <div data-note-file><a href="/notizen/datei?p=…" target="_blank">Name.zip</a></div>.
export const NOTE_FILE_ROUTE = "/notizen/datei";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    noteFile: {
      setNoteFile: (attrs: { path: string; name: string }) => ReturnType;
    };
  }
}

export const NoteFile = Node.create({
  name: "noteFile",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return { path: { default: "" }, name: { default: "Datei" } };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-note-file]",
        getAttrs: (el) => {
          const a = (el as HTMLElement).querySelector("a");
          const href = a?.getAttribute("href") ?? "";
          if (!href.startsWith(`${NOTE_FILE_ROUTE}?`)) return false;
          const path = new URLSearchParams(href.slice(href.indexOf("?") + 1)).get("p") ?? "";
          if (!path) return false;
          return { path, name: (a?.textContent ?? "").trim() || "Datei" };
        },
      },
    ];
  },

  renderHTML({ node }) {
    return ["div", { "data-note-file": "" }, ["a", { href: `${NOTE_FILE_ROUTE}?p=${encodeURIComponent(node.attrs.path)}`, target: "_blank", rel: "noopener noreferrer" }, node.attrs.name]];
  },

  addCommands() {
    return {
      setNoteFile:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
