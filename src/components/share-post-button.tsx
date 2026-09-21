"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, Send, X } from "lucide-react";
import { getShareTargets, sharePostToChat, type ShareTarget } from "@/app/chats/actions";
import { CharacterAvatar } from "./character-avatar";

// Papierflieger unter dem Beitrag: teilt ihn als Nachricht in einen der Chats des aktiven Charakters.
export function SharePostButton({ postId, characterId }: { postId: string; characterId: string }) {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<ShareTarget[] | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function openModal() {
    setOpen(true);
    setError(null);
    if (!targets) getShareTargets(characterId).then(setTargets);
  }

  function share(chatId: string) {
    setPendingId(chatId);
    setError(null);
    startTransition(async () => {
      const err = await sharePostToChat(chatId, characterId, postId);
      setPendingId(null);
      if (err) setError(err);
      else setSent((prev) => [...prev, chatId]);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="In Chat teilen"
        className="text-fg transition duration-150 hover:text-muted active:scale-75"
      >
        <Send className="h-7 w-7" strokeWidth={1.75} />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
            <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="absolute inset-0" />
            <div className="relative flex max-h-[75dvh] w-full max-w-sm flex-col rounded-t-3xl border border-line bg-surface shadow-xl sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="font-serif text-lg text-fg">Senden an</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Schließen"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
              <ul className="overflow-y-auto p-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
                {targets === null && <li className="px-3 py-4 text-sm text-muted">Lädt...</li>}
                {targets?.length === 0 && (
                  <li className="px-3 py-4 text-sm text-muted">Noch keine Chats. Starte zuerst einen Chat.</li>
                )}
                {targets?.map((t) => {
                  const done = sent.includes(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={done || pendingId === t.id}
                        onClick={() => share(t.id)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2 disabled:opacity-70"
                      >
                        <CharacterAvatar name={t.title} avatarUrl={t.avatarUrl} size={40} />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{t.title}</span>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                            done ? "bg-surface-2 text-fg-soft" : "bg-accent-strong text-on-accent-strong"
                          }`}
                        >
                          {done ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3" strokeWidth={3} /> Gesendet
                            </span>
                          ) : pendingId === t.id ? (
                            "..."
                          ) : (
                            "Senden"
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {error && <p className="px-4 pb-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
