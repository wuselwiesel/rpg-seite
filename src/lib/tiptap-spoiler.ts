import { Mark, mergeAttributes } from "@tiptap/core";

// Spoiler: markierter Text bleibt verborgen, bis man ihn anklickt. Gespeichert als <span data-type="spoiler">.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spoiler: {
      toggleSpoiler: () => ReturnType;
    };
  }
}

export const Spoiler = Mark.create({
  name: "spoiler",

  parseHTML() {
    return [{ tag: 'span[data-type="spoiler"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "spoiler" }), 0];
  },

  addCommands() {
    return {
      toggleSpoiler:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});
