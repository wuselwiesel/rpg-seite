"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getFeaturedBadges, type FeaturedBadge } from "@/app/badges/actions";
import { BADGE_NAMES_KEY, BADGE_PREF_EVENT } from "@/lib/badges";
import { badgePrefEnabled } from "./badge-row";
import { EmojiText } from "./custom-emoji-provider";

type Cache = { characters: Map<string, FeaturedBadge | null>; users: Map<string, FeaturedBadge | null> };
const cache: Cache = { characters: new Map(), users: new Map() };
const listeners = new Set<() => void>();
let pending = { characters: new Set<string>(), users: new Set<string>() };
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const batch = pending;
  pending = { characters: new Set(), users: new Set() };
  getFeaturedBadges([...batch.characters], [...batch.users])
    .then((res) => {
      for (const id of batch.characters) cache.characters.set(id, res.characters[id] ?? null);
      for (const id of batch.users) cache.users.set(id, res.users[id] ?? null);
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

// Haupt-Badge neben einem Namen (Beitrag, Kommentar). Lädt gesammelt nach; abschaltbar in den Einstellungen.
export function NameBadge({ characterId, userId }: { characterId?: string | null; userId?: string | null }) {
  const enabled = useSyncExternalStore(subscribePrefs, () => badgePrefEnabled(BADGE_NAMES_KEY), () => false);
  const [, rerender] = useState(0);

  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (characterId) request("characters", characterId);
    else if (userId) request("users", userId);
  }, [enabled, characterId, userId]);

  if (!enabled) return null;
  const badge = characterId ? cache.characters.get(characterId) : userId ? cache.users.get(userId) : null;
  if (!badge) return null;
  return (
    <span
      title={badge.name}
      className="inline-flex shrink-0 items-center self-center rounded-full px-1 text-[11px] leading-none"
      style={{ backgroundColor: `${badge.color}26` }}
    >
      <EmojiText text={badge.icon} />
    </span>
  );
}
