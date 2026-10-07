"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { WriterSelect } from "@/components/writer-select";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { Character } from "@/lib/types";

export type BundleSegment = { characterId: string; html: string };
type Row = BundleSegment & { key: number };

// Wie die Aktions-Symbole in den Nachrichten: mit Maus erst beim Darüberfahren, am Handy erst nach Antippen der Zeile
const REVEAL =
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/seg:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0 [@media(hover:none)]:group-data-[tapped]/seg:pointer-events-auto [@media(hover:none)]:group-data-[tapped]/seg:opacity-100";

// „Bündeln“: mehrere eigene Charaktere schreiben in EINER Nachricht. Je Abschnitt wählt man den Charakter per Klick und schreibt seinen Text;
// abgeschickt wird eine einzige Nachricht, die wie mehrere Nachrichten (mit Bild und Namen) aussieht.
export function BundleBuilder({
  ownCharacters,
  mentionCharacters,
  initial,
  showToolbar,
  onTyping,
  onChange,
}: {
  ownCharacters: Character[];
  mentionCharacters: Character[];
  initial: BundleSegment[];
  showToolbar: boolean;
  onTyping?: () => void;
  onChange?: (segments: BundleSegment[]) => void;
}) {
  const counter = useRef(initial.length);
  const [rows, setRows] = useState<Row[]>(() => initial.map((s, i) => ({ ...s, key: i })));
  // Aktueller Stand für schnelle Eingaben nacheinander (state-Updates kämen sonst veraltet an)
  const rowsRef = useRef<Row[]>(rows);
  const [tapped, setTapped] = useState<number | null>(null);

  function commit(next: Row[]) {
    rowsRef.current = next;
    setRows(next);
    onChange?.(next.map(({ characterId, html }) => ({ characterId, html })));
  }

  function addRow() {
    // Als Nächstes eine andere Figur als beim letzten Abschnitt vorschlagen
    const current = rowsRef.current;
    const last = current[current.length - 1]?.characterId;
    const next = ownCharacters.find((c) => c.id !== last) ?? ownCharacters[0];
    counter.current += 1;
    commit([...current, { key: counter.current, characterId: next.id, html: "" }]);
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="segments" value={JSON.stringify(rows.map((r) => ({ character_id: r.characterId, html: r.html })))} />
      {rows.map((row) => {
        const character = ownCharacters.find((c) => c.id === row.characterId) ?? ownCharacters[0];
        return (
          <div
            key={row.key}
            data-tapped={tapped === row.key ? "" : undefined}
            onClick={(e) => {
              if (!window.matchMedia("(hover: none)").matches) return;
              if ((e.target as HTMLElement).closest("button, input, textarea, select, [contenteditable]")) return;
              setTapped((v) => (v === row.key ? null : row.key));
            }}
            className="group/seg rounded-xl border border-line bg-surface p-2.5"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <WriterSelect
                  label=""
                  characters={ownCharacters}
                  value={row.characterId}
                  onChange={(id) => commit(rowsRef.current.map((r) => (r.key === row.key ? { ...r, characterId: id } : r)))}
                />
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => commit(rowsRef.current.filter((r) => r.key !== row.key))}
                  aria-label="Abschnitt entfernen"
                  title="Entfernen"
                  className={`shrink-0 rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-red-500 ${REVEAL}`}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
            <RichTextEditor
              name={`bundle-${row.key}`}
              initialContent={row.html}
              onChange={(html) => {
                commit(rowsRef.current.map((r) => (r.key === row.key ? { ...r, html } : r)));
                if (html) onTyping?.();
              }}
              mentionCharacters={mentionCharacters}
              minHeight={70}
              showToolbar={showToolbar}
              allowFontSelection
              placeholder={`${character.name} …`}
            />
          </div>
        );
      })}
      {rows.length < 8 && (
        <button
          type="button"
          onClick={addRow}
          className="inline-flex w-fit items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-accent"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          Weitere Figur
        </button>
      )}
    </div>
  );
}
