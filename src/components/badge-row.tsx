"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { BADGE_PREF_EVENT, BADGE_PROFILE_KEY, type BadgeView } from "@/lib/badges";
import { BadgeChip } from "./badge-chip";

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
export function BadgeRow({ badges, allHref = "/badges" }: { badges: BadgeView[]; allHref?: string }) {
  const enabled = useSyncExternalStore(subscribe, () => badgePrefEnabled(BADGE_PROFILE_KEY), () => true);
  if (!enabled || badges.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {badges.map((b) => (
        <BadgeChip key={b.awardId} icon={b.icon} name={b.name} description={b.description} color={b.color} />
      ))}
      <Link href={allHref} className="ml-1 text-xs text-muted underline decoration-dotted hover:text-fg">
        Alle Badges
      </Link>
    </div>
  );
}
