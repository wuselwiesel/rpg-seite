"use client";

import { useRouter } from "next/navigation";
import { SearchSelect } from "@/components/search-select";

type Entry = { id: string; name: string };

// ChaBo-Wechsler: zwischen den ChaBos der eigenen Charaktere und der NPCs der Welt wechseln, ohne den aktiven Charakter zu ändern.
export function ChaboSwitcher({ currentId, characters, npcs }: { currentId: string; characters: Entry[]; npcs: Entry[] }) {
  const router = useRouter();
  if (characters.length + npcs.length < 2) return null;
  const known = [...characters, ...npcs].some((c) => c.id === currentId);

  return (
    <div className="w-56 max-w-[14rem]">
      <SearchSelect
        ariaLabel="ChaBo wechseln"
        placeholder="Charakter suchen …"
        align="right"
        value={known ? currentId : ""}
        onChange={(id) => id && router.push(`/characters/${id}/chabo`)}
        emptyOption={known ? undefined : "ChaBo wählen"}
        className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
        options={[
          ...characters.map((c) => ({ value: c.id, label: c.name, group: "Charaktere" })),
          ...npcs.map((c) => ({ value: c.id, label: c.name, group: "NPCs" })),
        ]}
      />
    </div>
  );
}
