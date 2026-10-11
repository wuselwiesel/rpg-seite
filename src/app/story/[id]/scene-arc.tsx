"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus } from "lucide-react";
import { setSceneArcs } from "../actions";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm";

// Handlungsstränge einer Szene (mehrere möglich); Mitspielende der Welt können sie nachträglich setzen, ändern oder entfernen.
export function SceneArc({
  storyPostId,
  sceneArcs,
  arcs,
  canEdit,
}: {
  storyPostId: string;
  sceneArcs: { id: string; name: string }[];
  // Alle Handlungsstränge der Welt (nur zum Bearbeiten geladen)
  arcs: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [chosen, setChosen] = useState<string[]>(sceneArcs.map((a) => a.id));
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Am Handy: einmal antippen zeigt den Stift
  const [tapped, setTapped] = useState(false);

  if (sceneArcs.length === 0 && !canEdit) return null;

  const toggle = (id: string) => setChosen((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  function save() {
    startTransition(async () => {
      const err = await setSceneArcs(storyPostId, chosen, newName);
      if (err) return setError(err);
      setError(null);
      setEditing(false);
      setNewName("");
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="mb-3 flex w-full flex-col gap-3 rounded-xl bg-surface-2 p-3">
        <div role="group" aria-label="Handlungsstränge" className="flex flex-wrap gap-1.5">
          {arcs.map((a) => {
            const on = chosen.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(a.id)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition ${on ? "bg-accent-strong text-on-accent-strong" : "border border-line bg-surface text-fg-soft hover:border-accent hover:text-accent"}`}
              >
                {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                {a.name}
              </button>
            );
          })}
        </div>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} placeholder="Neuer Handlungsstrang, z. B. Der Sturm-Arc" aria-label="Name eines neuen Handlungsstrangs" className={field} />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={() => {
              setChosen(sceneArcs.map((a) => a.id));
              setNewName("");
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

  if (sceneArcs.length === 0) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-accent">
        <Plus className="h-3 w-3" strokeWidth={2.25} />
        Handlungsstrang
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
      className="group mb-2 flex flex-wrap items-center gap-1.5"
    >
      {sceneArcs.map((arc) => (
        <Link
          key={arc.id}
          href={`/story?arc=${arc.id}`}
          className="inline-flex w-fit items-center rounded-full bg-accent-strong/15 px-2.5 py-0.5 text-xs font-medium text-accent transition hover:bg-accent-strong/25"
        >
          {arc.name}
        </Link>
      ))}
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Handlungsstränge ändern"
          title="Handlungsstränge ändern"
          className="rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-fg [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0 [@media(hover:none)]:group-data-[tapped]:pointer-events-auto [@media(hover:none)]:group-data-[tapped]:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
