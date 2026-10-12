import { Node } from "@tiptap/core";

// PDF-Datei in einer Wiki-Seite: eigener Block mit Dateiname, der die Datei in einem neuen Tab öffnet.
// Gespeichert als <div data-pdf><a href="…" target="_blank">Name.pdf</a></div>.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pdfFile: {
      setPdfFile: (attrs: { url: string; name: string }) => ReturnType;
    };
  }
}

export const PdfFile = Node.create({
  name: "pdfFile",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: "" },
      name: { default: "PDF" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-pdf]",
        getAttrs: (el) => {
          const a = (el as HTMLElement).querySelector("a");
          const url = a?.getAttribute("href") ?? "";
          if (!/^https?:\/\//i.test(url)) return false;
          return { url, name: (a?.textContent ?? "").trim() || "PDF" };
        },
      },
    ];
  },

  renderHTML({ node }) {
    return ["div", { "data-pdf": "" }, ["a", { href: node.attrs.url, target: "_blank", rel: "noopener noreferrer" }, node.attrs.name]];
  },

  addCommands() {
    return {
      setPdfFile:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
