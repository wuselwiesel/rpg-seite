"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { X } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { FriendButton } from "@/components/friend-button";
import { alertDialog } from "@/components/confirm-dialog";
import { greetNewMember } from "@/app/friends/welcome-actions";
import type { WelcomeCard } from "@/lib/welcome-data";

const KEY = "ww-welcome-dismissed";
const EVENT = "ww-welcome-dismissed-change";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

// „Neu dabei“: Willkommens-Karten mit „Befreunden“ und „Begrüßen“; wegklickbar je Karte
export function WelcomeStrip({ cards }: { cards: WelcomeCard[] }) {
  const dismissedRaw = useSyncExternalStore(subscribe, snapshot, () => "");
  const dismissed = new Set(dismissedRaw.split(",").filter(Boolean));
  const [greeted, setGreeted] = useState<Set<string>>(() => new Set(cards.filter((c) => c.greeted).map((c) => c.id)));
  const [pending, startTransition] = useTransition();

  const visible = cards.filter((c) => !dismissed.has(c.id));
  if (visible.length === 0) return null;

  function dismiss(id: string) {
    try {
      localStorage.setItem(KEY, [...dismissed, id].slice(-100).join(","));
    } catch {
      // egal
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <section aria-label="Neu dabei" className="mb-5">
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {visible.map((c) => (
          <li key={c.id} className="relative flex w-64 shrink-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-3">
            <button type="button" onClick={() => dismiss(c.id)} aria-label="Ausblenden" className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-3 pr-6">
              <CharacterAvatar name={c.name} avatarUrl={c.avatarUrl} size={44} />
              <div className="min-w-0">
                <p className="line-clamp-2 break-words font-medium leading-snug text-fg">Willkommen, {c.name}!</p>
                <p className="truncate text-xs text-muted">{c.worldName ? `neu in ${c.worldName}` : "neu bei Wortwinkel"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FriendButton username={c.username} status={c.status} />
              {greeted.has(c.id) ? (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">Begrüßt</span>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const err = await greetNewMember(c.id);
                      if (err) void alertDialog(err);
                      else setGreeted((prev) => new Set(prev).add(c.id));
                    })
                  }
                  className="rounded-full bg-accent-strong px-3 py-1 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
                >
                  Begrüßen
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
