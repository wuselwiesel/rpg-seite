"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { BADGE_PREF_EVENT, BADGE_PROFILE_KEY, type BadgeView } from "@/lib/badges";
import { revokeBadge, setBadgeHidden } from "@/app/badges/actions";
import { BadgeChip } from "./badge-chip";
import { EmojiText } from "./custom-emoji-provider";

function subscribe(callback: () => void) {
  window.addEventListener(BADGE_PREF_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(BADGE_PREF_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function badgePrefEnabled(key: string): boolean {
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return true;
  }
}

// Badge-Reihe unter der Bio; lässt sich in den Einstellungen (pro Gerät) ausschalten.
// Klick auf ein Badge oder auf „Sammlung“ führt in die Badge-Sammlung (`collectionHref`).
// Mit `editable` (eigenes Profil) sieht man auch ausgeblendete Badges und kann sie hier direkt ein- und ausblenden.
export function BadgeRow({
  badges,
  collectionHref,
  editable = false,
}: {
  badges: BadgeView[];
  collectionHref: string;
  editable?: boolean;
}) {
  const enabled = useSyncExternalStore(subscribe, () => badgePrefEnabled(BADGE_PROFILE_KEY), () => true);
  const [editing, setEditing] = useState(false);
  const [hidden, setHidden] = useState(() => new Set(badges.filter((b) => b.hidden).map((b) => b.awardId)));
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!enabled || badges.length === 0) return null;

  // Verliehene (besondere) Badges lassen sich ganz entfernen.
  function remove(b: BadgeView) {
    if (!confirm(`${b.name} endgültig entfernen? Wer es verliehen hat, kann es dir erneut geben.`)) return;
    setError(null);
    startTransition(async () => {
      const err = await revokeBadge(b.awardId);
      if (err) setError(err);
      else setRemoved((cur) => new Set(cur).add(b.awardId));
    });
  }

  function toggle(id: string) {
    const show = hidden.has(id);
    const before = hidden;
    setHidden((cur) => {
      const next = new Set(cur);
      if (show) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
    startTransition(async () => {
      const err = await setBadgeHidden(id, !show);
      if (err) {
        setHidden(before);
        setError(err);
      }
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {badges.filter((b) => !removed.has(b.awardId)).map((b) =>
          editing ? (
            <span key={b.awardId} className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggle(b.awardId)}
              aria-pressed={!hidden.has(b.awardId)}
              title={hidden.has(b.awardId) ? "Ausgeblendet – klicken zum Anzeigen" : "Angezeigt – klicken zum Ausblenden"}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                hidden.has(b.awardId) ? "border-line bg-surface-2 text-muted line-through opacity-60" : "text-fg"
              }`}
              style={hidden.has(b.awardId) ? undefined : { borderColor: b.color, backgroundColor: `${b.color}1f` }}
            >
              <span aria-hidden>{hidden.has(b.awardId) ? "🙈" : "👁"}</span>
              <EmojiText text={`${b.icon} ${b.name}`} />
            </button>
            {b.kind === "custom" && (
              <button
                type="button"
                onClick={() => remove(b)}
                aria-label={`${b.name} entfernen`}
                title="Verliehenes Badge entfernen"
                className="rounded-full p-0.5 text-xs text-muted transition hover:text-red-500"
              >
                ✕
              </button>
            )}
            </span>
          ) : hidden.has(b.awardId) ? (
            // Nur für die Besitzer:in sichtbar: ausgeblendete Badges, abgeblendet.
            <span key={b.awardId} className="opacity-50" title="Nur für dich sichtbar (ausgeblendet)">
              <BadgeChip icon={b.icon} name={b.name} description={b.description} color={b.color} locked />
            </span>
          ) : (
            <BadgeChip
              key={b.awardId}
              icon={b.icon}
              name={b.name}
              description={b.description}
              color={b.color}
              href={`${collectionHref}?badge=${encodeURIComponent(b.key)}`}
            />
          ),
        )}
        <Link href={collectionHref} className="ml-1 text-xs text-muted underline decoration-dotted hover:text-fg">
          Sammlung ansehen
        </Link>
        {editable && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="ml-1 text-xs text-accent hover:underline"
          >
            {editing ? "Fertig" : "Anzeige ändern"}
          </button>
        )}
      </div>
      {editing && <p className="text-xs text-muted">Tippe ein Badge an, um es ein- oder auszublenden.</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
