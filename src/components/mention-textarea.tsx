"use client";

import { useMemo, useRef, useState } from "react";
import { encodeMention } from "@/lib/mentions";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";

export type MentionQuery = { start: number; query: string };

export function findMentionQuery(text: string, cursor: number): MentionQuery | null {
  const uptoCursor = text.slice(0, cursor);
  const atIndex = uptoCursor.lastIndexOf("@");
  if (atIndex === -1) return null;

  const charBefore = atIndex > 0 ? uptoCursor[atIndex - 1] : " ";
  if (!/\s/.test(charBefore)) return null;

  const query = uptoCursor.slice(atIndex + 1);
  if (query.includes("\n") || query.length > 30 || /\s{2,}/.test(query)) return null;

  return { start: atIndex, query };
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function encodeMentionsInText(text: string, mentions: { name: string; id: string }[]) {
  let result = text;
  for (const mention of mentions) {
    const token = `@${mention.name}`;
    const index = result.indexOf(token);
    if (index !== -1) {
      result =
        result.slice(0, index) +
        encodeMention(mention.name, mention.id) +
        result.slice(index + token.length);
    }
  }
  return result;
}

export function MentionTextarea({
  name,
  characters,
  placeholder,
  rows = 3,
  required,
  initialText = "",
  initialMentions = [],
  autoFocus = false,
  className = "",
}: {
  name: string;
  characters: Character[];
  placeholder?: string;
  rows?: number;
  required?: boolean;
  initialText?: string;
  initialMentions?: { name: string; id: string }[];
  autoFocus?: boolean;
  className?: string;
}) {
  const [text, setText] = useState(initialText);
  const [mentions, setMentions] = useState<{ name: string; id: string }[]>(initialMentions);
  const [query, setQuery] = useState<MentionQuery | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const matches = useMemo(() => {
    if (!query) return [];
    const q = query.query.toLowerCase();
    return characters.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, characters]);

  function selectCharacter(character: Character) {
    if (!query) return;
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, query.start);
    const after = text.slice(cursor);
    const name = firstName(character.name);
    const inserted = `@${name} `;
    const newText = before + inserted + after;

    setText(newText);
    setMentions((prev) => [...prev, { name, id: character.id }]);
    setQuery(null);

    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setText(value);
    setQuery(findMentionQuery(value, e.target.selectionStart ?? value.length));
    setHighlighted(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!query || matches.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectCharacter(matches[highlighted]);
    } else if (e.key === "Escape") {
      setQuery(null);
    }
  }

  const encoded = useMemo(() => encodeMentionsInText(text, mentions), [text, mentions]);

  return (
    <div className="relative">
      <input type="hidden" name={name} value={encoded} />
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        required={required}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm ${className}`}
      />
      {query && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-64 max-w-full overflow-hidden rounded-md border border-line bg-surface shadow-lg">
          {matches.map((character, index) => (
            <button
              key={character.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectCharacter(character);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                index === highlighted ? "bg-surface-2 text-fg" : "text-fg-soft hover:bg-surface-2"
              }`}
            >
              <CharacterAvatar name={character.name} avatarUrl={character.avatar_url} size={24} />
              {character.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
