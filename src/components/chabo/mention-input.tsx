"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { CharacterAvatar } from "@/components/character-avatar";
import { insertMention, matchTargets, mentionQuery, splitMentions, withoutAt, type MentionTarget } from "@/lib/sheet-mentions";

// Text mit anklickbaren @Namen (Link zum Profil des Charakters).
export function MentionText({ text, targets, className }: { text: string; targets: MentionTarget[]; className?: string }) {
  return (
    <span className={className}>
      {splitMentions(text, targets).map((p, i) =>
        p.kind === "mention" ? (
          <Link key={i} href={`/characters/${p.target.id}`} className="font-medium text-accent underline-offset-2 hover:underline">
            {withoutAt(p.text)}
          </Link>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  );
}

// Eingabefeld: Tippt man „@“, erscheint eine Liste der Charaktere der Welt; Auswahl mit Klick, Pfeiltasten und Enter.
export function MentionInput({
  value,
  onChange,
  targets,
  placeholder,
  ariaLabel,
  maxLength = 200,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  targets: MentionTarget[];
  placeholder?: string;
  ariaLabel?: string;
  maxLength?: number;
  className?: string;
}) {
  const [menu, setMenu] = useState<{ start: number; caret: number; items: MentionTarget[] } | null>(null);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const listId = useId();

  function update(text: string, caret: number) {
    const q = mentionQuery(text, caret);
    const items = q ? matchTargets(targets, q.query) : [];
    if (q && items.length > 0) {
      setMenu({ start: q.start, caret, items });
      setActive(0);
    } else {
      setMenu(null);
    }
  }

  function pick(t: MentionTarget) {
    if (!menu) return;
    const next = insertMention(value, menu.caret, menu.start, t.name);
    onChange(next.text.slice(0, maxLength));
    setMenu(null);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(next.caret, next.caret);
    });
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={Boolean(menu)}
        aria-controls={menu ? listId : undefined}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          update(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={(e) => {
          if (!menu) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % menu.items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + menu.items.length) % menu.items.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            pick(menu.items[active]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setMenu(null);
          }
        }}
        onBlur={() => setMenu(null)}
        className={className}
      />
      {menu && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-lg">
          {menu.items.map((t, i) => (
            <li key={t.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                // mousedown statt click, damit das Feld nicht vorher den Fokus verliert
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(t);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${i === active ? "bg-surface-2 text-fg" : "text-fg-soft"}`}
              >
                <CharacterAvatar name={t.name} avatarUrl={t.avatar_url} size={24} />
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
