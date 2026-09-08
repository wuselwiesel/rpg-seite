import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { MentionList, type MentionListHandle } from "@/components/mention-list";
import type { Character } from "@/lib/types";

function positionPopup(popup: HTMLDivElement, clientRect: (() => DOMRect | null) | null | undefined) {
  const rect = clientRect?.();
  if (!rect) return;
  popup.style.left = `${rect.left}px`;
  popup.style.top = `${rect.bottom + 4}px`;
}

export function createMentionSuggestion(characters: Character[]): Omit<SuggestionOptions, "editor"> {
  return {
    // Charakternamen können aus mehreren Wörtern bestehen (z.B. "Rich A") -
    // ohne allowSpaces würde ein Leerzeichen die Erwähnungssuche sofort abbrechen.
    allowSpaces: true,
    items: ({ query }: { query: string }) =>
      characters.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8),

    render: () => {
      let component: ReactRenderer<MentionListHandle>;
      let popup: HTMLDivElement;

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, { props, editor: props.editor });
          popup = document.createElement("div");
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
