"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, ChevronLeft, SendHorizontal, Trash2 } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { setAccountChatMuted } from "../actions";
import { useAccountChat, type AccountMessage } from "@/lib/use-account-chat";

export type { AccountMessage };

const time = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

export function AccountChatRoom({
  chatId,
  userId,
  partnerName,
  partnerAvatarUrl,
  partnerProfileId,
  partnerLastRead,
  initialMessages,
  initialMuted,
}: {
  chatId: string;
  userId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
  partnerProfileId: string | null;
  partnerLastRead: string | null;
  initialMessages: AccountMessage[];
  initialMuted: boolean;
}) {
  const { messages, partnerRead, error, send, remove } = useAccountChat(chatId, userId, initialMessages, partnerLastRead);
  const [draft, setDraft] = useState("");
  const [muted, setMuted] = useState(initialMuted);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function submit() {
    const text = draft;
    if (!text.trim()) return;
    setDraft("");
    void send(text);
    inputRef.current?.focus();
  }

  async function toggleMute() {
    const next = !muted;
    setMuted(next);
    const err = await setAccountChatMuted(chatId, next);
    if (err) setMuted(!next);
  }

  const lastOwnId = [...messages].reverse().find((m) => m.sender_id === userId)?.id;

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col px-4 lg:max-w-none lg:px-6">
      <div className="flex items-center justify-between gap-3 border-b border-line py-3 lg:py-4">
        <div className="flex min-w-0 items-center gap-1">
          <Link
            href="/redaktion/chat"
            aria-label="Zurück zu allen Chats"
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg transition hover:bg-surface-2 active:bg-surface-3 lg:hidden"
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={2} />
          </Link>
          {partnerProfileId ? (
            <Link href={`/redaktion/profil/${partnerProfileId}`} className="flex min-w-0 items-center gap-2.5">
              <CharacterAvatar name={partnerName} avatarUrl={partnerAvatarUrl} size={36} />
              <h1 className="truncate font-serif text-xl text-fg">{partnerName}</h1>
            </Link>
          ) : (
            <h1 className="truncate font-serif text-xl text-fg">{partnerName}</h1>
          )}
        </div>
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={muted}
          title={muted ? "Stumm – tippen zum Aufheben" : "Stumm schalten"}
          className={`shrink-0 rounded-full p-1.5 transition hover:bg-surface-2 ${muted ? "text-accent" : "text-muted hover:text-fg"}`}
        >
          {muted ? <BellOff className="h-4 w-4" strokeWidth={2} /> : <Bell className="h-4 w-4" strokeWidth={2} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted">Schreib die erste Nachricht.</p>}
        <div className="flex flex-col gap-1">
          {messages.map((m, i) => {
            const mine = m.sender_id === userId;
            const newDay = i === 0 || day(messages[i - 1].created_at) !== day(m.created_at);
            const seen = mine && m.id === lastOwnId && partnerRead && partnerRead >= m.created_at;
            return (
              <div key={m.id}>
                {newDay && <p className="my-3 text-center text-xs text-muted">{day(m.created_at)}</p>}
                <div className={`group flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] ${
                      mine ? "rounded-br-md bg-accent-strong text-on-accent-strong" : "rounded-bl-md bg-surface-2 text-fg"
                    } ${m.pending ? "opacity-60" : ""}`}
                  >
                    {m.content}
                  </div>
                  <span className="shrink-0 pb-1 text-[10px] text-muted opacity-0 transition group-hover:opacity-100">
                    {time(m.created_at)}
                  </span>
                  {mine && !m.pending && (
                    <button
                      type="button"
                      onClick={() => confirm("Diese Nachricht wirklich löschen?") && void remove(m.id)}
                      aria-label="Nachricht löschen"
                      className="shrink-0 pb-1 text-muted opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>
                {seen && <p className="mt-0.5 text-right text-[10px] text-muted">Gelesen</p>}
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {error && <p className="pb-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 border-t border-line py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <textarea
          ref={inputRef}
          value={draft}
          rows={1}
          maxLength={4000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Nachricht…"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2 text-[15px] text-fg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Senden"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong transition hover:opacity-90 disabled:opacity-40"
        >
          <SendHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}
