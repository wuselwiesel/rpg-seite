"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { setSceneArc } from "../actions";

const NEW = "__new__";
const field = "rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm";

// Handlungsstrang einer Szene; die Autor:in (und die Welt-Besitzerin) kann ihn nachträglich setzen, ändern oder entfernen.
export function SceneArc({
  storyPostId,
  arc,
  arcs,
  canEdit,
}: {
  storyPostId: string;
  arc: { id: string; name: string } | null;
  // Alle Handlungsstränge der Welt (nur zum Bearbeiten geladen)
  arcs: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState(arc?.id ?? "");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Am Handy: einmal antippen zeigt den Stift
  const [tapped, setTapped] = useState(false);

  if (!arc && !canEdit) return null;

  function save() {
    startTransition(async () => {
      const err = choice === NEW ? await setSceneArc(storyPostId, null, newName) : await setSceneArc(storyPostId, choice || null);
      if (err) return setError(err);
      setError(null);
      setEditing(false);
      setNewName("");
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="mb-3 flex w-full flex-col gap-2 rounded-xl bg-surface-2 p-3">
        <label className="flex flex-col gap-1 text-sm text-fg-soft">
          Handlungsstrang
          <select value={choice} onChange={(e) => setChoice(e.target.value)} className={field}>
            <option value="">Keinem Handlungsstrang zuordnen</option>
            {arcs.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            <option value={NEW}>+ Neuen Handlungsstrang erschaffen</option>
          </select>
        </label>
        {choice === NEW && (
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} placeholder="z. B. Der Sturm-Arc" aria-label="Name des neuen Handlungsstrangs" className={field} />
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending || (choice === NEW && !newName.trim())}
            onClick={save}
            className="rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={() => {
              setChoice(arc?.id ?? "");
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

  if (!arc) {
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
      className="group mb-2 flex items-center gap-1.5"
    >
      <Link
        href={`/story?arc=${arc.id}`}
        className="inline-flex w-fit items-center rounded-full bg-accent-strong/15 px-2.5 py-0.5 text-xs font-medium text-accent transition hover:bg-accent-strong/25"
      >
        {arc.name}
      </Link>
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Handlungsstrang ändern"
          title="Handlungsstrang ändern"
          className="rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-fg [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0 [@media(hover:none)]:group-data-[tapped]:pointer-events-auto [@media(hover:none)]:group-data-[tapped]:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
