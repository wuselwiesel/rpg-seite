"use client";

import { EmojiText } from "@/components/custom-emoji-provider";
import { CustomEmojiPicker } from "@/components/custom-emoji-picker";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isSendKey, useEnterSends } from "@/lib/send-pref";
import { Check, ChevronLeft, ImagePlus, Pencil, SendHorizontal, Trash2, X } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { OnlineBadge, OnlineDot } from "@/components/online-status";
import { setAccountChatMuted } from "../actions";
import { useAccountChat, type AccountMessage } from "@/lib/use-account-chat";
import { ChatThemePicker } from "@/components/chat-theme-picker";
import { chatThemeStyle, type ChatTheme } from "@/lib/chat-theme";
import { useIsDark } from "@/lib/use-dark";
import { useTyping } from "@/lib/use-typing";
import { TypingLine } from "@/components/typing-line";
import { ZoomableImage } from "@/components/zoomable-image";
import { useImageDraft } from "@/lib/chat-image";

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
  initialTheme,
}: {
  chatId: string;
  userId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
  partnerProfileId: string | null;
  partnerLastRead: string | null;
  initialMessages: AccountMessage[];
  initialMuted: boolean;
  initialTheme: ChatTheme;
}) {
  const { messages, partnerRead, error, send, edit, remove } = useAccountChat(chatId, userId, initialMessages, partnerLastRead);
  const [draft, setDraft] = useState("");
  const image = useImageDraft();
  const typing = useTyping(`account-typing-${chatId}`, userId, "");
  const enterSends = useEnterSends();
  const [muted, setMuted] = useState(initialMuted);
  const [theme, setTheme] = useState(initialTheme);
  const dark = useIsDark();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typing.names.length]);

  // Kommt eine Nachricht vom Gegenüber an, tippt die Person nicht mehr
  const lastIncomingId = [...messages].reverse().find((m) => m.sender_id !== userId)?.id;
  const clearTyping = typing.clear;
  useEffect(() => {
    clearTyping();
  }, [lastIncomingId, clearTyping]);

  function submit() {
    const text = draft;
    if (!text.trim() && !image.pending) return;
    const attached = image.take();
    setDraft("");
    void send(text, attached).then((ok) => {
      if (ok) return;
      setDraft((d) => d || text);
      if (attached) image.restore(attached);
    });
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
    <div
      style={chatThemeStyle(theme, dark)}
      className="mx-auto flex h-dvh max-w-2xl xl:max-w-3xl 2xl:max-w-4xl flex-col px-4 text-fg lg:max-w-none lg:px-6"
    >
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
              <span className="relative shrink-0">
                <CharacterAvatar name={partnerName} avatarUrl={partnerAvatarUrl} size={36} />
                <OnlineDot userId={partnerProfileId} overlay />
              </span>
              <span className="flex min-w-0 flex-col">
                <h1 className="truncate font-serif text-xl leading-tight text-fg">{partnerName}</h1>
                <OnlineBadge userId={partnerProfileId} />
              </span>
            </Link>
          ) : (
            <h1 className="truncate font-serif text-xl text-fg">{partnerName}</h1>
          )}
        </div>
        <ChatThemePicker
          kind="account"
          chatId={chatId}
          theme={theme}
          onChange={setTheme}
          muted={muted}
          onToggleMute={toggleMute}
        />
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted">Schreib die erste Nachricht.</p>}
        <div className="flex flex-col gap-1">
          {messages.map((m, i) => {
            const mine = m.sender_id === userId;
            const newDay = i === 0 || day(messages[i - 1].created_at) !== day(m.created_at);
            const seen = mine && m.id === lastOwnId && partnerRead && partnerRead >= m.created_at;
            const showActions = mine && !m.pending && activeId === m.id && editingId !== m.id;
            return (
              <div key={m.id}>
                {newDay && <p className="my-3 text-center text-xs text-muted">{day(m.created_at)}</p>}
                {editingId === m.id ? (
                  <div className="ml-auto flex max-w-[85%] flex-col gap-1.5">
                    <textarea
                      value={editDraft}
                      autoFocus
                      rows={2}
                      maxLength={4000}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="resize-none rounded-2xl border border-accent bg-surface px-3.5 py-2 text-[15px] text-fg outline-none"
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-fg"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        disabled={!editDraft.trim() && !m.image_url}
                        onClick={() => {
                          void edit(m.id, editDraft);
                          setEditingId(null);
                          setActiveId(null);
                        }}
                        className="flex items-center gap-1 rounded-full bg-accent-strong px-3 py-1 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-40"
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`group flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                    <div
                      onClick={mine ? () => setActiveId(activeId === m.id ? null : m.id) : undefined}
                      className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl text-[15px] ${
                        m.image_url ? "p-1" : "px-3.5 py-2"
                      } ${
                        mine
                          ? "cursor-pointer rounded-br-md bg-accent-strong text-on-accent-strong"
                          : "rounded-bl-md bg-surface-2 text-fg"
                      } ${m.pending ? "opacity-60" : ""}`}
                    >
                      {m.image_url && (
                        <ZoomableImage src={m.image_url} alt="Gesendetes Bild" className="rounded-xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.image_url} alt="Gesendetes Bild" className="max-h-72 max-w-[20rem] rounded-xl object-contain" />
                        </ZoomableImage>
                      )}
                      {m.content && (
                        <div className={m.image_url ? "px-2.5 pb-1 pt-1.5" : ""}>
                          <EmojiText text={m.content} />
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 pb-1 text-[10px] text-muted opacity-0 transition group-hover:opacity-100">
                      {time(m.created_at)}
                      {m.updated_at ? " · bearbeitet" : ""}
                    </span>
                    {mine && !m.pending && (
                      <span
                        className={`flex shrink-0 items-center pb-0.5 transition ${
                          showActions ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m.id);
                            setEditDraft(m.content);
                          }}
                          aria-label="Nachricht bearbeiten"
                          title="Bearbeiten"
                          className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirm("Diese Nachricht wirklich löschen?") && void remove(m.id)}
                          aria-label="Nachricht löschen"
                          title="Löschen"
                          className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </span>
                    )}
                  </div>
                )}
                {seen && <p className="mt-0.5 text-right text-[10px] text-muted">Gelesen</p>}
              </div>
            );
          })}
          <TypingLine names={typing.names.length ? [partnerName] : []} className="px-1 pt-1" />
        </div>
        <div ref={bottomRef} />
      </div>

      {(error || image.error) && <p className="pb-1 text-xs text-red-600 dark:text-red-400">{error ?? image.error}</p>}
      {image.pending && (
        <div className="relative mb-2 w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.pending.previewUrl} alt="Vorschau" className="max-h-40 max-w-full rounded-xl object-contain" />
          <button
            type="button"
            onClick={image.clear}
            title="Bild entfernen"
            aria-label="Bild entfernen"
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-fg text-app shadow"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 border-t border-line py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <CustomEmojiPicker
          direction="up"
          className="flex h-10 w-10 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          onPick={(t) => setDraft((d) => d + t)}
        />
        <label
          title="Bild senden"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
        >
          <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
          <input type="file" accept="image/*" onChange={image.pick} className="hidden" />
        </label>
        <textarea
          ref={inputRef}
          value={draft}
          rows={1}
          maxLength={4000}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value) typing.announce();
          }}
          onKeyDown={(e) => {
            if (isSendKey(e, enterSends)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Nachricht…"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2 text-[15px] text-fg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!draft.trim() && !image.pending}
          aria-label="Senden"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong transition hover:opacity-90 disabled:opacity-40"
        >
          <SendHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}
