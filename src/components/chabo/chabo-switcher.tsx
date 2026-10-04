"use client";

import { useRouter } from "next/navigation";

type Entry = { id: string; name: string };

// ChaBo-Wechsler: zwischen den ChaBos der eigenen Charaktere und der NPCs der Welt wechseln, ohne den aktiven Charakter zu ändern.
export function ChaboSwitcher({ currentId, characters, npcs }: { currentId: string; characters: Entry[]; npcs: Entry[] }) {
  const router = useRouter();
  if (characters.length + npcs.length < 2) return null;
  const known = [...characters, ...npcs].some((c) => c.id === currentId);

  return (
    <select
      aria-label="ChaBo wechseln"
      value={known ? currentId : ""}
      onChange={(e) => e.target.value && router.push(`/characters/${e.target.value}/chabo`)}
      className="max-w-[14rem] rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
    >
      {!known && <option value="">ChaBo wählen</option>}
      {characters.length > 0 && (
        <optgroup label="Charaktere">
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
      )}
      {npcs.length > 0 && (
        <optgroup label="NPCs">
          {npcs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
