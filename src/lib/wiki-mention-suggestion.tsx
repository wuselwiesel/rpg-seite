import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import { WikiMentionList } from "@/components/wiki-mention-list";
import { matchWikiPages, wikiLinkText, type WikiMentionItem } from "@/lib/wiki-mention";
import type { MentionListHandle } from "@/components/mention-list";

function positionPopup(popup: HTMLDivElement, clientRect: (() => DOMRect | null) | null | undefined) {
  const rect = clientRect?.();
  if (!rect) return;
  popup.style.left = `${Math.min(rect.left, window.innerWidth - 270)}px`;
  popup.style.top = `${rect.bottom + 4}px`;
}

function createSuggestion(pages: WikiMentionItem[]): Omit<SuggestionOptions<WikiMentionItem>, "editor"> {
  return {
    char: "@",
    pluginKey: new PluginKey("wikiMention"),
    allowSpaces: true,
    items: ({ query }) => matchWikiPages(pages, query),
    command: ({ editor, range, props }: { editor: Editor; range: Range; props: WikiMentionItem }) => {
      if (props.kind === "character") {
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: "mention", attrs: { id: props.id, label: props.title } },
            { type: "text", text: " " },
          ])
          .run();
        return;
      }
      editor.chain().focus().insertContentAt(range, `${wikiLinkText(props.title)} `).run();
    },
    render: () => {
      let component: ReactRenderer<MentionListHandle>;
      let popup: HTMLDivElement;
      return {
        onStart: (props) => {
          component = new ReactRenderer(WikiMentionList, { props, editor: props.editor });
          popup = document.createElement("div");
          popup.dataset.mentionPopup = "1";
          popup.style.position = "fixed";
          popup.style.zIndex = "50";
          document.body.appendChild(popup);
          popup.appendChild(component.element);
          positionPopup(popup, props.clientRect);
        },
        onUpdate: (props) => {
          component.updateProps(props);
          positionPopup(popup, props.clientRect);
        },
        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            popup.remove();
            component.destroy();
            return true;
          }
          return component.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          popup.remove();
          component.destroy();
        },
      };
    },
  };
}

export function wikiMentionExtension(pages: WikiMentionItem[]) {
  return Extension.create({
    name: "wikiMention",
    addProseMirrorPlugins() {
      return [Suggestion({ editor: this.editor, ...createSuggestion(pages) })];
    },
  });
}
