"use client";

import { useState } from "react";
import Link from "next/link";
import { CharacterAvatar } from "@/components/character-avatar";
import { useOnline } from "@/components/online-status";

export type OnlineMember = { id: string; name: string; avatarUrl: string | null };

const SHOWN = 6;

// Wer aus der Welt gerade online ist (ohne dich): Bild mit grünem Punkt, Name, Status-Emoji/-Text und „schreibt gerade“.
// Ein Klick auf eine Zeile öffnet den Account-Chat mit der Person.
export function useOnlineMembers(members: OnlineMember[], selfId: string) {
  const { enabled, onlineIds } = useOnline();
  return enabled ? members.filter((m) => m.id !== selfId && onlineIds.has(m.id)) : [];
}

export function OnlineList({ members, selfId, className = "", empty = true }: { members: OnlineMember[]; selfId: string; className?: string; empty?: boolean }) {
  const { enabled, looks } = useOnline();
  const [all, setAll] = useState(false);
  const online = useOnlineMembers(members, selfId);
  if (!enabled) return null;
  if (online.length === 0) return empty ? <p className={`px-2 text-xs text-muted ${className}`}>Niemand online</p> : null;
  const shown = all ? online : online.slice(0, SHOWN);
  const rest = online.length - shown.length;
  return (
    <ul className={`flex flex-col gap-0.5 ${className}`} aria-label="Online">
      {shown.map((m) => {
        const look = looks.get(m.id);
        return (
          <li key={m.id}>
            <Link
              href={`/redaktion/chat/mit/${m.id}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              <span className="relative shrink-0">
                <CharacterAvatar name={m.name} avatarUrl={m.avatarUrl} size={24} />
                <span aria-hidden className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-app bg-emerald-500" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate">{m.name}</span>
                  {look?.emoji && <span aria-hidden className="shrink-0 text-xs leading-none">{look.emoji}</span>}
                  {look?.writing && (
                    <span className="flex shrink-0 gap-0.5" role="status" aria-label="schreibt gerade">
                      <span className="typing-dot" />
                      <span className="typing-dot [animation-delay:150ms]" />
                      <span className="typing-dot [animation-delay:300ms]" />
                    </span>
                  )}
                </span>
                {look?.text && <span className="block truncate text-xs text-muted">{look.text}</span>}
              </span>
            </Link>
          </li>
        );
      })}
      {rest > 0 && (
        <li>
          <button type="button" onClick={() => setAll(true)} className="rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-fg">
            + {rest} weitere
          </button>
        </li>
      )}
    </ul>
  );
}
