"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { FriendButton } from "@/components/friend-button";
import type { FriendSuggestion } from "@/lib/welcome-data";

const KEY = "ww-suggestions-dismissed";
const EVENT = "ww-suggestions-dismissed-change";

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

// „Kennst du schon?“: Mitglieder deiner Welten, mit denen du noch nicht befreundet bist
export function FriendSuggestions({ suggestions }: { suggestions: FriendSuggestion[] }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const dismissed = new Set(raw.split(",").filter(Boolean));
  const visible = suggestions.filter((s) => !dismissed.has(s.userId));
  if (visible.length === 0) return null;

  function dismiss(id: string) {
    try {
      localStorage.setItem(KEY, [...dismissed, id].slice(-200).join(","));
    } catch {
      // egal
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <section aria-label="Kennst du schon?" className="mb-8">
      <h2 className="mb-3 font-serif text-xl text-fg">Kennst du schon?</h2>
      <ul className="flex flex-col gap-2">
        {visible.map((s) => (
          <li key={s.userId} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
            <CharacterAvatar name={s.name} avatarUrl={s.avatarUrl} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{s.name}</p>
              <p className="truncate text-xs text-muted">{s.worlds.length > 0 ? `in ${s.worlds.join(", ")}` : `@${s.username}`}</p>
            </div>
            <FriendButton username={s.username} status={s.status} />
            <button type="button" onClick={() => dismiss(s.userId)} aria-label={`${s.name} ausblenden`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
