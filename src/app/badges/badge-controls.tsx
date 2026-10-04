"use client";

import { useActionState, useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { CustomEmojiPicker } from "@/components/custom-emoji-picker";
import { EmojiText } from "@/components/custom-emoji-provider";
import { awardAccountBadge, awardBadge, createBadgeDef, deleteBadgeDef, revokeBadge, setBadgeHidden, setFeaturedBadge } from "./actions";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";

export function CreateBadgeForm({ scope = "world" }: { scope?: "world" | "account" }) {
  const [error, formAction, pending] = useActionState(createBadgeDef, null);
  const [color, setColor] = useState("#96565d");
  const [icon, setIcon] = useState("🏅");

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <div className="flex gap-2">
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="icon" value={icon} />
        <div className="flex shrink-0 items-stretch gap-1">
          <span
            className="flex h-10 w-12 items-center justify-center rounded-md border border-line bg-surface text-2xl"
            aria-label="Gewähltes Symbol"
          >
            <EmojiText text={icon} />
          </span>
          <CustomEmojiPicker
            direction="down"
            onPick={(t) => setIcon(t.trim())}
            className="flex h-10 items-center justify-center rounded-md border border-line px-2.5 text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          />
        </div>
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

export function AwardControls({
  defId,
  characters,
  ownCharacters = [],
  defaultAsId,
}: {
  defId: string;
  characters: { id: string; name: string }[];
  // Eigene Charaktere, mit denen man verleihen kann; defaultAsId = vorausgewählter (aktiver) Charakter.
  ownCharacters?: { id: string; name: string }[];
  defaultAsId?: string | null;
}) {
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? "");
  const [asId, setAsId] = useState(defaultAsId ?? ownCharacters[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {ownCharacters.length > 0 && (
        <label className="flex w-full items-center gap-2 text-xs text-fg-soft">
          Verleihen als
          <select value={asId} onChange={(e) => setAsId(e.target.value)} className={`min-w-0 flex-1 ${field}`} aria-label="Verleihen als Charakter">
            {ownCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <select value={characterId} onChange={(e) => setCharacterId(e.target.value)} className={`min-w-0 flex-1 ${field}`} aria-label="Charakter, der das Badge bekommt">
        {characters.filter((c) => c.id !== asId).map((c) => (
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
            setError(await awardBadge(defId, characterId, asId || null));
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

// Redaktions-Badge an eine befreundete Person verleihen
export function AccountAwardControls({ defId, friends }: { defId: string; friends: { id: string; name: string }[] }) {
  const [recipientId, setRecipientId] = useState(friends[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (friends.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} className={`min-w-0 flex-1 ${field}`} aria-label="Person, die das Badge bekommt">
        {friends.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending || !recipientId}
        onClick={() =>
          startTransition(async () => {
            const err = await awardAccountBadge(defId, recipientId);
            setError(err);
            setDone(err ? null : "Verliehen.");
          })
        }
        className="rounded-md bg-surface-2 px-3 py-2 text-sm font-medium text-fg transition hover:bg-surface-3 disabled:opacity-50"
      >
        Verleihen
      </button>
      {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
      {done && <p role="status" className="w-full text-xs text-emerald-700 dark:text-emerald-400">{done}</p>}
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

// Pro Badge festlegen, ob es im Profil usw. angezeigt wird.
export function VisibilityList({
  items,
}: {
  items: { awardId: string; icon: string; name: string; hidden: boolean; removable?: boolean; from?: string | null }[];
}) {
  const [hidden, setHidden] = useState(() => new Set(items.filter((i) => i.hidden).map((i) => i.awardId)));
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Mehrere Badges auf einmal: Zustand funktional fortschreiben, sonst überschreibt die letzte Änderung die anderen.
  function apply(ids: string[], show: boolean) {
    if (ids.length === 0) return;
    const before = hidden;
    setHidden((cur) => {
      const next = new Set(cur);
      for (const id of ids) {
        if (show) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    setError(null);
    startTransition(async () => {
      const results = await Promise.all(ids.map((id) => setBadgeHidden(id, !show)));
      const err = results.find((r) => r);
      if (err) {
        setHidden(before);
        setError(err);
      }
    });
  }

  const toggle = (id: string, show: boolean) => apply([id], show);

  function remove(id: string, label: string) {
    if (!confirm(`${label} endgültig entfernen? Wer es verliehen hat, kann es dir erneut geben.`)) return;
    setError(null);
    startTransition(async () => {
      const err = await revokeBadge(id);
      if (err) setError(err);
      else setRemoved((cur) => new Set(cur).add(id));
    });
  }
  const setAll = (show: boolean) => apply(items.filter((i) => hidden.has(i.awardId) === show).map((i) => i.awardId), show);

  if (items.length === 0) return <p className="text-sm text-muted">Noch keine Badges erreicht.</p>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 text-xs">
        <button type="button" onClick={() => setAll(true)} disabled={pending} className="text-accent hover:underline">
          Alle anzeigen
        </button>
        <button type="button" onClick={() => setAll(false)} disabled={pending} className="text-accent hover:underline">
          Alle ausblenden
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {items.filter((i) => !removed.has(i.awardId)).map((i) => {
          const shown = !hidden.has(i.awardId);
          return (
            <li key={i.awardId}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={shown}
                  onChange={(e) => toggle(i.awardId, e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className={`min-w-0 flex-1 truncate ${shown ? "text-fg" : "text-muted line-through"}`}>
                  <EmojiText text={`${i.icon} ${i.name}`} />
                </span>
                {i.from && <span className="hidden shrink-0 text-xs text-muted sm:inline">von {i.from}</span>}
                <span className="shrink-0 text-xs text-muted">{shown ? "angezeigt" : "ausgeblendet"}</span>
                {i.removable && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      remove(i.awardId, i.name);
                    }}
                    aria-label={`${i.name} entfernen`}
                    title="Verliehenes Badge entfernen"
                    className="shrink-0 rounded-full p-1 text-muted transition hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
