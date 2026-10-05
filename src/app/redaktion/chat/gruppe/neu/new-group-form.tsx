"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { createAccountGroup } from "../../actions";

type Friend = { id: string; name: string; avatarUrl: string | null };

export function NewGroupForm({ friends }: { friends: Friend[] }) {
  const [error, action, pending] = useActionState(createAccountGroup, null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex items-center gap-1">
        <Link
          href="/redaktion/chat"
          aria-label="Zurück zu allen Chats"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-fg transition hover:bg-surface-2"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2} />
        </Link>
        <h1 className="font-serif text-2xl text-fg">Neue Gruppe</h1>
      </div>
      <input
        name="name"
        required
        maxLength={60}
        placeholder="Gruppenname"
        aria-label="Gruppenname"
        className="rounded-xl border border-line bg-surface px-4 py-2.5 text-[15px] text-fg outline-none focus:border-accent"
      />
      <div className="flex flex-col gap-1">
        {friends.length === 0 && <p className="text-sm text-muted">Du hast noch keine Freund:innen, die du hinzufügen könntest.</p>}
        {friends.map((f) => {
          const on = selected.has(f.id);
          return (
            <label
              key={f.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition ${on ? "bg-surface-2" : "hover:bg-surface-2/60"}`}
            >
              <input type="checkbox" name="member" value={f.id} checked={on} onChange={() => toggle(f.id)} className="h-4 w-4 accent-accent" />
              <CharacterAvatar name={f.name} avatarUrl={f.avatarUrl} size={36} />
              <span className="truncate text-sm font-medium text-fg">{f.name}</span>
            </label>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending || selected.size < 2}
        className="self-start rounded-full bg-accent-strong px-5 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-40"
      >
        Gruppe anlegen
      </button>
    </form>
  );
}
