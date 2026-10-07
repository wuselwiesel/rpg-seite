"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { CastPicker, type CastOption } from "@/components/cast-picker";
import { setSceneCast } from "../actions";

// „Mit dabei“ in einer Szene: verlinkte Charaktere; die Autor:in kann die Liste nachträglich ändern (Stift erscheint beim Darüberfahren bzw. Antippen).
export function SceneCast({
  storyPostId,
  cast,
  options,
  canEdit,
}: {
  storyPostId: string;
  cast: CastOption[];
  // Alle wählbaren Charaktere (nur für die Autor:in geladen)
  options: CastOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string[]>(cast.map((c) => c.id));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Am Handy: einmal auf die Zeile tippen zeigt den Stift
  const [tapped, setTapped] = useState(false);

  if (!editing && cast.length === 0 && !canEdit) return null;

  if (editing) {
    return (
      <div className="mb-3 flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
        <p className="text-sm text-fg-soft">Mit dabei</p>
        <CastPicker options={options} value={value} onChange={setValue} />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const err = await setSceneCast(storyPostId, value);
                if (err) return setError(err);
                setError(null);
                setEditing(false);
                router.refresh();
              })
            }
            className="rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(cast.map((c) => c.id));
              setError(null);
              setEditing(false);
            }}
            className="rounded-md px-3 py-1.5 text-sm text-muted transition hover:text-fg"
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  if (cast.length === 0) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="mb-3 text-sm text-muted transition hover:text-fg">
        Mit dabei hinzufügen
      </button>
    );
  }

  return (
    <div
      data-tapped={tapped ? "" : undefined}
      onClick={(e) => {
        if (!window.matchMedia("(hover: none)").matches) return;
        if ((e.target as HTMLElement).closest("a, button")) return;
        setTapped((v) => !v);
      }}
      className="group mb-3 flex flex-wrap items-center gap-1.5"
    >
      {cast.length > 0 && <span className="text-xs text-muted">Mit dabei</span>}
      {cast.map((c) => (
        <Link key={c.id} href={`/characters/${c.id}`} className="flex items-center gap-1.5 rounded-full bg-surface-2 py-0.5 pl-0.5 pr-2.5 text-sm text-fg-soft transition hover:text-fg">
          <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={22} />
          {c.name}
        </Link>
      ))}
      {canEdit && (
        <button
          type="button"
          onClick={() => {
            setValue(cast.map((c) => c.id));
            setEditing(true);
          }}
          aria-label="Mit dabei ändern"
          title="Mit dabei ändern"
          className="rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-fg [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0 [@media(hover:none)]:group-data-[tapped]:pointer-events-auto [@media(hover:none)]:group-data-[tapped]:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
