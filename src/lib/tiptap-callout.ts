import { Node, mergeAttributes } from "@tiptap/core";
import { CALLOUT_KINDS, type CalloutKind } from "@/lib/callout-kinds";

// Hinweis-Kasten: farbig abgesetzter Block mit beliebigem Inhalt. Gespeichert als <div data-callout="info|tipp|achtung|gefahr">.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (kind: CalloutKind) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: "info",
        parseHTML: (el) => {
          const v = el.getAttribute("data-callout");
          return (CALLOUT_KINDS as readonly string[]).includes(v ?? "") ? v : "info";
        },
        renderHTML: (attrs) => ({ "data-callout": attrs.kind }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      // Ist der Cursor schon in einem Kasten, ändert sich nur die Art; sonst wird der Absatz eingepackt.
      setCallout:
        (kind) =>
        ({ commands, editor }) =>
          editor.isActive("callout") ? commands.updateAttributes("callout", { kind }) : commands.wrapIn("callout", { kind }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift("callout"),
    };
  },
});
