"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getFeaturedBadges, type FeaturedBadge } from "@/app/badges/actions";
import { BADGE_NAMES_KEY, BADGE_PREF_EVENT } from "@/lib/badges";
import { badgePrefEnabled } from "./badge-row";
import { EmojiText } from "./custom-emoji-provider";

// Pro Person: Haupt-Badge und frei gewähltes Zeichen neben dem Namen.
type Decor = { badge: FeaturedBadge | null; symbol: string | null };
type Cache = { characters: Map<string, Decor | null>; users: Map<string, Decor | null> };
const cache: Cache = { characters: new Map(), users: new Map() };
const listeners = new Set<() => void>();
let pending = { characters: new Set<string>(), users: new Set<string>() };
let timer: ReturnType<typeof setTimeout> | null = null;

function toDecor(badge: FeaturedBadge | undefined, symbol: string | undefined): Decor | null {
  return badge || symbol ? { badge: badge ?? null, symbol: symbol ?? null } : null;
}

function flush() {
  timer = null;
  const batch = pending;
  pending = { characters: new Set(), users: new Set() };
  getFeaturedBadges([...batch.characters], [...batch.users])
    .then((res) => {
      for (const id of batch.characters) cache.characters.set(id, toDecor(res.characters[id], res.symbols.characters[id]));
      for (const id of batch.users) cache.users.set(id, toDecor(res.users[id], res.symbols.users[id]));
    })
    .catch(() => {
      for (const id of batch.characters) cache.characters.set(id, null);
      for (const id of batch.users) cache.users.set(id, null);
    })
    .finally(() => listeners.forEach((l) => l()));
}

function request(kind: "characters" | "users", id: string) {
  if (cache[kind].has(id)) return;
  cache[kind].set(id, null);
  pending[kind].add(id);
  if (!timer) timer = setTimeout(flush, 60);
}

function subscribePrefs(callback: () => void) {
  window.addEventListener(BADGE_PREF_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(BADGE_PREF_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// Zeichen und Haupt-Badge neben einem Namen (Beitrag, Kommentar). Lädt gesammelt nach. Das gewählte Zeichen erscheint
// immer, das Haupt-Badge nur, wenn die Anzeige in den Einstellungen nicht abgeschaltet ist.
export function NameBadge({ characterId, userId }: { characterId?: string | null; userId?: string | null }) {
  const badgesEnabled = useSyncExternalStore(subscribePrefs, () => badgePrefEnabled(BADGE_NAMES_KEY), () => false);
  const [, rerender] = useState(0);

  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  useEffect(() => {
    if (characterId) request("characters", characterId);
    else if (userId) request("users", userId);
  }, [characterId, userId]);

  const decor = characterId ? cache.characters.get(characterId) : userId ? cache.users.get(userId) : null;
  if (!decor) return null;
  const badge = badgesEnabled ? decor.badge : null;
  if (!badge && !decor.symbol) return null;
  // Klick auf das Badge führt in die Badge-Sammlung der Person.
  const base = characterId ? `/badges/sammlung/${characterId}` : `/badges/konto/${userId}`;
  const href = badge?.key ? `${base}?badge=${encodeURIComponent(badge.key)}` : base;
  return (
    <>
      {decor.symbol && (
        <span className="inline-flex shrink-0 items-center self-center text-[13px] leading-none">
          <EmojiText text={decor.symbol} />
        </span>
      )}
      {badge && (
        <Link
          href={href}
          title={`${badge.name} – Sammlung ansehen`}
          className="inline-flex shrink-0 items-center self-center rounded-full px-1 text-[11px] leading-none transition hover:opacity-80"
          style={{ backgroundColor: `${badge.color}26` }}
        >
          <EmojiText text={badge.icon} />
        </Link>
      )}
    </>
  );
}
