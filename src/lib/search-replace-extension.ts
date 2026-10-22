import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { findMatches } from "@/lib/notes";

// Suchen und Ersetzen im Editor: Treffer werden markiert (aktueller Treffer kräftiger), Befehle zum Weiterspringen und Ersetzen.
export type SearchState = { query: string; caseSensitive: boolean; current: number; matches: { from: number; to: number }[] };

export const searchKey = new PluginKey<SearchState>("noteSearchReplace");

function compute(doc: PMNode, query: string, caseSensitive: boolean) {
  const matches: { from: number; to: number }[] = [];
  if (!query) return matches;
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (const i of findMatches(node.text, query, caseSensitive)) matches.push({ from: pos + i, to: pos + i + query.length });
  });
  return matches;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchReplace: {
      setSearch: (query: string, caseSensitive?: boolean) => ReturnType;
      stepSearch: (dir: 1 | -1) => ReturnType;
      replaceCurrent: (text: string) => ReturnType;
      replaceAll: (text: string) => ReturnType;
    };
  }
}

export const SearchReplace = Extension.create({
  name: "searchReplace",
  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: () => ({ query: "", caseSensitive: false, current: 0, matches: [] }),
          apply(tr, prev, _old, newState) {
            const meta = tr.getMeta(searchKey) as Partial<SearchState> | undefined;
            let next = meta ? { ...prev, ...meta } : prev;
            if (meta || tr.docChanged) {
              const matches = compute(newState.doc, next.query, next.caseSensitive);
              next = { ...next, matches, current: matches.length === 0 ? 0 : Math.min(next.current, matches.length - 1) };
            }
            return next;
          },
        },
        props: {
          decorations(state) {
            const st = searchKey.getState(state);
            if (!st || st.matches.length === 0) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              st.matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === st.current ? "search-match search-match-current" : "search-match" })),
            );
          },
        },
      }),
    ];
  },
  addCommands() {
    return {
      setSearch:
        (query, caseSensitive = false) =>
        ({ tr, dispatch }) => {
          dispatch?.(tr.setMeta(searchKey, { query, caseSensitive, current: 0 }));
          return true;
        },
      stepSearch:
        (dir) =>
        ({ tr, state, dispatch }) => {
          const st = searchKey.getState(state);
          if (!st || st.matches.length === 0) return false;
          const current = (st.current + dir + st.matches.length) % st.matches.length;
          const m = st.matches[current];
          dispatch?.(tr.setMeta(searchKey, { current }).setSelection(TextSelection.create(tr.doc, m.from, m.to)).scrollIntoView());
          return true;
        },
      replaceCurrent:
        (text) =>
        ({ tr, state, dispatch }) => {
          const st = searchKey.getState(state);
          const m = st?.matches[st.current];
          if (!st || !m) return false;
          dispatch?.(tr.insertText(text, m.from, m.to));
          return true;
        },
      replaceAll:
        (text) =>
        ({ tr, state, dispatch }) => {
          const st = searchKey.getState(state);
          if (!st || st.matches.length === 0) return false;
          for (const m of [...st.matches].reverse()) tr.insertText(text, m.from, m.to);
          dispatch?.(tr);
          return true;
        },
    };
  },
});
