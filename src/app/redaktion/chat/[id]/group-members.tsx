"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Pencil, UserPlus, X } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { AvatarUpload } from "@/components/avatar-upload";
import { OnlineDot } from "@/components/online-status";
import { addAccountGroupMembers, removeAccountGroupMember, updateAccountGroup } from "../actions";

export type ChatMember = { id: string; name: string; avatarUrl: string | null; username?: string };

// Mitgliederliste eines Gruppen- oder Welt-Chats. In Gruppen kann die Verwalter:in umbenennen, hinzufügen und entfernen; jede:r kann gehen.
export function GroupMembers({
  chatId,
  kind,
  title,
  avatarUrl,
  members,
  userId,
  isCreator,
  addableFriends,
  worldId,
  onClose,
}: {
  chatId: string;
  kind: "group" | "world";
  title: string;
  avatarUrl: string | null;
  members: ChatMember[];
  userId: string;
  isCreator: boolean;
  addableFriends: ChatMember[];
  worldId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  async function run(job: () => Promise<string | null>, after?: () => void) {
    setBusy(true);
    setError(null);
    const err = await job();
    setBusy(false);
    if (err) return setError(err);
    after?.();
    router.refresh();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Mitglieder" onClick={onClose} className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          {isCreator ? (
            <form
              className="flex min-w-0 flex-1 items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim() && name.trim() !== title) void run(() => updateAccountGroup(chatId, name.trim(), avatarUrl));
              }}
            >
              <input
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                aria-label="Gruppenname"
                className="min-w-0 flex-1 rounded-lg border border-line bg-app px-2.5 py-1 font-serif text-lg text-fg outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={busy || !name.trim() || name.trim() === title}
                aria-label="Namen speichern"
                title="Namen speichern"
                className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-40"
              >
                <Pencil className="h-4 w-4" strokeWidth={2} />
              </button>
            </form>
          ) : (
            <h2 className="min-w-0 flex-1 truncate font-serif text-lg text-fg">{title}</h2>
          )}
          <button type="button" onClick={onClose} aria-label="Schließen" className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {kind === "group" && isCreator && (
            <div className="px-2 pb-3 pt-1">
              <AvatarUpload
                name="avatar"
                displayName={title}
                initialUrl={avatarUrl}
                onChange={(url) => void run(() => updateAccountGroup(chatId, title, url))}
              />
            </div>
          )}
          <p className="px-2 pb-1 text-xs text-muted">{members.length === 1 ? "1 Mitglied" : `${members.length} Mitglieder`}</p>
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
              <Link href={`/redaktion/profil/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="relative shrink-0">
                  <CharacterAvatar name={m.name} avatarUrl={m.avatarUrl} size={36} />
                  <OnlineDot userId={m.id} overlay />
                </span>
                <span className="truncate text-sm font-medium text-fg">{m.name}{m.id === userId ? " (du)" : ""}</span>
              </Link>
              {kind === "group" && isCreator && m.id !== userId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirm(`${m.name} aus der Gruppe entfernen?`) && void run(() => removeAccountGroupMember(chatId, m.id))}
                  aria-label={`${m.name} entfernen`}
                  title="Entfernen"
                  className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-red-500"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </div>
          ))}

          {isCreator && (
            <div className="mt-2 border-t border-line pt-2">
              {!adding ? (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  disabled={addableFriends.length === 0}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-fg transition hover:bg-surface-2/60 disabled:opacity-40"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-fg-soft">
                    <UserPlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  Personen hinzufügen
                </button>
              ) : (
                <div className="flex flex-col gap-1">
                  {addableFriends.map((f) => (
                    <label key={f.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-2/60">
                      <input
                        type="checkbox"
                        checked={picked.has(f.id)}
                        onChange={() =>
                          setPicked((prev) => {
                            const next = new Set(prev);
                            if (next.has(f.id)) next.delete(f.id);
                            else next.add(f.id);
                            return next;
                          })
                        }
                        className="h-4 w-4 accent-accent"
                      />
                      <CharacterAvatar name={f.name} avatarUrl={f.avatarUrl} size={32} />
                      <span className="truncate text-sm text-fg">{f.name}</span>
                    </label>
                  ))}
                  <button
                    type="button"
                    disabled={busy || picked.size === 0}
                    onClick={() => void run(() => addAccountGroupMembers(chatId, [...picked]), () => { setAdding(false); setPicked(new Set()); })}
                    className="mt-1 self-start rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-40"
                  >
                    Hinzufügen
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="px-4 pb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {kind === "group" && (
          <div className="border-t border-line px-2 py-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                confirm("Gruppe wirklich verlassen?") &&
                void run(() => removeAccountGroupMember(chatId, userId), () => router.push("/redaktion/chat"))
              }
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-red-600 transition hover:bg-surface-2/60 dark:text-red-400"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
              Gruppe verlassen
            </button>
          </div>
        )}
        {kind === "world" && worldId && (
          <div className="border-t border-line px-2 py-2">
            <Link href={`/worlds/${worldId}`} className="block rounded-xl px-2 py-2 text-sm font-medium text-fg transition hover:bg-surface-2/60">
              Zur Welt
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
