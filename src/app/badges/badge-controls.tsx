"use client";

import { useActionState, useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { awardBadge, createBadgeDef, deleteBadgeDef, revokeBadge, setFeaturedBadge } from "./actions";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";

export function CreateBadgeForm() {
  const [error, formAction, pending] = useActionState(createBadgeDef, null);
  const [color, setColor] = useState("#96565d");

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <p className="text-sm font-medium text-fg">Neues Badge gestalten</p>
      <div className="flex gap-2">
        <input name="icon" required maxLength={40} placeholder="🏅" aria-label="Symbol" className={`w-20 text-center ${field}`} />
        <input name="name" required minLength={2} maxLength={40} placeholder="Name, z. B. Ritter des Nebelhafens" aria-label="Name" className={`min-w-0 flex-1 ${field}`} />
        <input
          type="color"
          name="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label="Farbe"
          className="h-10 w-12 cursor-pointer rounded-md border border-line bg-surface p-1"
        />
      </div>
      <input name="description" maxLength={200} placeholder="Wofür gibt es das Badge? (optional)" className={field} />
      <p className="text-xs text-muted">
        Als Symbol geht ein Emoji oder ein eigenes Emoji der Welt, z. B. <code>:wappen:</code>.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichere..." : "Badge anlegen"}
      </button>
    </form>
  );
}

export function AwardControls({ defId, characters }: { defId: string; characters: { id: string; name: string }[] }) {
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select value={characterId} onChange={(e) => setCharacterId(e.target.value)} className={`min-w-0 flex-1 ${field}`} aria-label="Charakter">
        {characters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending || !characterId}
        onClick={() =>
          startTransition(async () => {
            setError(await awardBadge(defId, characterId));
          })
        }
        className="rounded-md bg-surface-2 px-3 py-2 text-sm font-medium text-fg transition hover:bg-surface-3 disabled:opacity-50"
      >
        Verleihen
      </button>
      {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function RevokeButton({ awardId, label }: { awardId: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`${label} entziehen`}
      title="Entziehen"
      onClick={() => confirm(`${label} wirklich entziehen?`) && startTransition(async () => void (await revokeBadge(awardId)))}
      className="rounded-full p-0.5 text-muted transition hover:text-red-500 disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

export function DeleteDefButton({ defId, name }: { defId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`${name} löschen`}
      title="Badge löschen (auch bei allen, die es haben)"
      onClick={() =>
        confirm(`„${name}“ löschen? Es verschwindet auch bei allen, die es haben.`) &&
        startTransition(async () => void (await deleteBadgeDef(defId)))
      }
      className="rounded-full p-1 text-muted transition hover:text-red-500 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

export function FeaturedPicker({
  target,
  options,
  currentId,
}: {
  target: { characterId: string } | { account: true };
  options: { awardId: string; label: string }[];
  currentId: string | null;
}) {
  const [value, setValue] = useState(currentId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        onChange={async (e) => {
          const next = e.target.value;
          setValue(next);
          setSaved(false);
          const err = await setFeaturedBadge(target, next || null);
          setError(err);
          setSaved(!err);
        }}
        className={field}
        aria-label="Haupt-Badge"
      >
        <option value="">Kein Haupt-Badge</option>
        {options.map((o) => (
          <option key={o.awardId} value={o.awardId}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {saved && <p className="text-xs text-muted">Gespeichert.</p>}
    </div>
  );
}
