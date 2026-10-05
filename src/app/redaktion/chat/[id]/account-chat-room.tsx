"use client";

import { EmojiText } from "@/components/custom-emoji-provider";
import { CustomEmojiPicker } from "@/components/custom-emoji-picker";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { isSendKey, useEnterSends } from "@/lib/send-pref";
import { BellOff, Bell, Check, ChevronLeft, CornerUpLeft, Globe2, ImagePlus, Pencil, Pin, PinOff, Search, EyeOff, SendHorizontal, SmilePlus, Trash2, UsersRound, X } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { OnlineBadge, OnlineDot } from "@/components/online-status";
import { setAccountChatMuted } from "../actions";
import { useAccountChat, type AccountMessage, type AccountReaction } from "@/lib/use-account-chat";
import { SpoilerText } from "@/components/spoiler-text";
import { EmojiPickerDialog } from "@/components/emoji-picker-dialog";
import { splitMentions } from "@/lib/account-mentions";
import { ChatThemePicker } from "@/components/chat-theme-picker";
import { chatThemeStyle, type ChatTheme } from "@/lib/chat-theme";
import { useIsDark } from "@/lib/use-dark";
import { useTyping } from "@/lib/use-typing";
import { TypingLine } from "@/components/typing-line";
import { AttachmentPreview, ChatMedia } from "@/components/chat-media";
import { useImageDraft } from "@/lib/chat-image";
import { createClient } from "@/lib/supabase/client";
import { GroupMembers, type ChatMember } from "./group-members";

export type { AccountMessage };

const time = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

export function AccountChatRoom({
  chatId,
  userId,
  kind,
  title,
  avatarUrl,
  members,
  isCreator,
  addableFriends,
  selfName,
  worldId,
  partnerProfileId,
  initialReads,
  initialReactions,
  initialMessages,
  initialMuted,
  initialTheme,
}: {
  chatId: string;
  userId: string;
  kind: "direct" | "group" | "world";
  title: string;
  avatarUrl: string | null;
  members: ChatMember[];
  isCreator: boolean;
  addableFriends: ChatMember[];
  selfName: string;
  worldId: string | null;
  partnerProfileId: string | null;
  initialReads: Record<string, string>;
  initialReactions: AccountReaction[];
  initialMessages: AccountMessage[];
  initialMuted: boolean;
  initialTheme: ChatTheme;
}) {
  const { messages, reads, reactions, error, send, edit, remove, pin, toggleReaction } = useAccountChat(
    chatId,
    userId,
    initialMessages,
    initialReads,
    undefined,
    initialReactions,
  );
  const [draft, setDraft] = useState("");
  const image = useImageDraft();
  const typing = useTyping(`account-typing-${chatId}`, userId, selfName);
  const isDirect = kind === "direct";
  const partnerRead = isDirect ? (Object.values(reads)[0] ?? null) : null;
  const [replyTo, setReplyTo] = useState<AccountMessage | null>(null);
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pinsOpen, setPinsOpen] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  // Absender, die nicht (mehr) in der Mitgliederliste stehen (z. B. neu in der Welt), werden bei Bedarf nachgeladen.
  const [extraSenders, setExtraSenders] = useState<Record<string, ChatMember>>({});
  const senderMap = useMemo(() => new Map<string, ChatMember>([...members, ...Object.values(extraSenders)].map((m) => [m.id, m])), [members, extraSenders]);
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

  useEffect(() => {
    if (isDirect) return;
    const unknown = [...new Set(messages.map((m) => m.sender_id))].filter((id) => id !== userId && !senderMap.has(id));
    if (!unknown.length) return;
    createClient()
      .from("profiles")
      .select("id, username, nickname, avatar_url")
      .in("id", unknown)
      .then(({ data }) => {
        const found = Object.fromEntries(
          (data ?? []).map((p) => [p.id, { id: p.id, name: p.nickname || p.username, avatarUrl: p.avatar_url } as ChatMember]),
        );
        // Wer nicht gefunden wird (Konto weg), bekommt einen Platzhalter, damit nicht ständig neu geladen wird.
        for (const id of unknown) if (!found[id]) found[id] = { id, name: "Ehemaliges Mitglied", avatarUrl: null };
        setExtraSenders((prev) => ({ ...prev, ...found }));
      });
  }, [messages, isDirect, userId, senderMap]);

  function submit() {
    const text = draft;
    if (!text.trim() && !image.pending) return;
    const attached = image.take();
    setDraft("");
    const reply = replyTo;
    setReplyTo(null);
    void send(text, attached, reply?.id).then((ok) => {
      if (ok) return;
      setDraft((d) => d || text);
      setReplyTo((r) => r ?? reply);
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
  const usernames = useMemo(() => new Set(members.map((m) => m.username?.toLowerCase()).filter((u): u is string => !!u)), [members]);
  const nameOf = (id: string) => (id === userId ? "Du" : (senderMap.get(id)?.name ?? "…"));
  const snippet = (m: AccountMessage) => (m.content.replace(/\s+/g, " ").trim() || (m.image_url ? "Anhang" : "Nachricht")).slice(0, 90);
  const pinned = messages.filter((m) => m.pinned_at).sort((a, b) => (b.pinned_at ?? "").localeCompare(a.pinned_at ?? ""));
  const results = query.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(query.trim().toLowerCase())).slice(-40).reverse()
    : [];
  const reactionsByMessage = useMemo(() => {
    const map = new Map<string, Map<string, string[]>>();
    for (const r of reactions) {
      const byEmoji = map.get(r.message_id) ?? new Map<string, string[]>();
      byEmoji.set(r.emoji, [...(byEmoji.get(r.emoji) ?? []), r.user_id]);
      map.set(r.message_id, byEmoji);
    }
    return map;
  }, [reactions]);
  // @-Vorschläge: nur in Gruppen/Welt-Chat, wenn das letzte Wort mit @ beginnt
  const mentionQuery = !isDirect ? (draft.match(/(?:^|\s)@([\p{L}\p{N}_.-]*)$/u)?.[1] ?? null) : null;
  const mentionMatches =
    mentionQuery === null
      ? []
      : members
          .filter((m) => m.id !== userId && m.username && (m.username.toLowerCase().startsWith(mentionQuery.toLowerCase()) || m.name.toLowerCase().startsWith(mentionQuery.toLowerCase())))
          .slice(0, 6);

  function jumpTo(id: string) {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlashId(id);
    setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 1600);
  }

  // Markierten Text (ohne Auswahl den ganzen Entwurf) in ||…|| setzen: wird im Chat verborgen, bis man ihn anklickt
  function wrapSpoiler() {
    const el = inputRef.current;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    const [from, to] = start === end ? [0, draft.length] : [start, end];
    if (from === to) return;
    setDraft(`${draft.slice(0, from)}||${draft.slice(from, to)}||${draft.slice(to)}`);
    el?.focus();
  }

  function pickMention(username: string) {
    setDraft((d) => d.replace(/@([\p{L}\p{N}_.-]*)$/u, `@${username} `));
    inputRef.current?.focus();
  }

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
          {isDirect && partnerProfileId ? (
            <Link href={`/redaktion/profil/${partnerProfileId}`} className="flex min-w-0 items-center gap-2.5">
              <span className="relative shrink-0">
                <CharacterAvatar name={title} avatarUrl={avatarUrl} size={36} />
                <OnlineDot userId={partnerProfileId} overlay />
              </span>
              <span className="flex min-w-0 flex-col">
                <h1 className="truncate font-serif text-xl leading-tight text-fg">{title}</h1>
                <OnlineBadge userId={partnerProfileId} />
              </span>
            </Link>
          ) : isDirect ? (
            <h1 className="truncate font-serif text-xl text-fg">{title}</h1>
          ) : (
            <button type="button" onClick={() => setMembersOpen(true)} className="flex min-w-0 items-center gap-2.5 text-left">
              <span className="relative shrink-0">
                <CharacterAvatar name={title} avatarUrl={avatarUrl} size={36} />
              </span>
              <span className="flex min-w-0 flex-col">
                <h1 className="truncate font-serif text-xl leading-tight text-fg">{title}</h1>
                <span className="flex min-w-0 items-center gap-1 text-xs text-muted">
                  {kind === "world" ? <Globe2 className="h-3 w-3 shrink-0" strokeWidth={2} /> : <UsersRound className="h-3 w-3 shrink-0" strokeWidth={2} />}
                  <span className="truncate">
                    {[...members].sort((x, y) => (x.id === userId ? -1 : y.id === userId ? 1 : x.name.localeCompare(y.name, "de"))).map((m) => (m.id === userId ? "Du" : m.name)).join(", ")}
                  </span>
                </span>
              </span>
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => {
            setSearchOpen((v) => !v);
            setQuery("");
          }}
          aria-label="Im Chat suchen"
          title="Suchen"
          className={`rounded-full p-1.5 transition hover:bg-surface-2 hover:text-fg ${searchOpen ? "bg-surface-2 text-fg" : "text-muted"}`}
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Stummschaltung aufheben" : "Chat stumm schalten"}
          title={muted ? "Stummschaltung aufheben" : "Stumm schalten"}
          className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          {muted ? <BellOff className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        </button>
        <ChatThemePicker
          kind="account"
          chatId={chatId}
          theme={theme}
          onChange={setTheme}
          muted={muted}
          onToggleMute={toggleMute}
        />
        </div>
      </div>

      {searchOpen && (
        <div className="border-b border-line py-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Im Chat suchen"
            aria-label="Im Chat suchen"
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-fg outline-none focus:border-accent"
          />
          {query.trim() && (
            <ul className="mt-2 max-h-56 overflow-y-auto">
              {results.length === 0 && <li className="px-2 py-2 text-sm text-muted">Nichts gefunden.</li>}
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      jumpTo(m.id);
                      setSearchOpen(false);
                    }}
                    className="flex w-full flex-col rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-2"
                  >
                    <span className="text-xs text-muted">
                      {nameOf(m.sender_id)} · {day(m.created_at)}, {time(m.created_at)}
                    </span>
                    <span className="truncate text-sm text-fg">{snippet(m)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {pinned.length > 0 && (
        <div className="flex items-center gap-2 border-b border-line py-1.5 text-sm">
          <Pin className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} />
          <button type="button" onClick={() => jumpTo(pinned[0].id)} className="min-w-0 flex-1 truncate text-left text-fg-soft hover:text-fg">
            {snippet(pinned[0])}
          </button>
          {pinned.length > 1 && (
            <button type="button" onClick={() => setPinsOpen(true)} className="shrink-0 text-xs text-accent hover:underline">
              Alle ({pinned.length})
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted">Schreib die erste Nachricht.</p>}
        <div className="flex flex-col gap-1">
          {messages.map((m, i) => {
            const mine = m.sender_id === userId;
            const newDay = i === 0 || day(messages[i - 1].created_at) !== day(m.created_at);
            const readers = !isDirect && mine && m.id === lastOwnId ? Object.entries(reads).filter(([uid, at]) => uid !== userId && at >= m.created_at).length : 0;
            const seen = isDirect && mine && m.id === lastOwnId && partnerRead && partnerRead >= m.created_at;
            const replyTarget = m.reply_to_id ? messages.find((x) => x.id === m.reply_to_id) : null;
            const reactionChips = reactionsByMessage.get(m.id);
            const mentionsMe = m.mentioned_user_ids?.includes(userId);
            const runStart = !isDirect && !mine && (i === 0 || messages[i - 1].sender_id !== m.sender_id || newDay);
            const sender = senderMap.get(m.sender_id);
            const showActions = !m.pending && activeId === m.id && editingId !== m.id;
            return (
              <div key={m.id} id={`msg-${m.id}`} className={flashId === m.id ? "rounded-xl bg-accent/10 transition" : "transition"}>
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
                  <>
                  {runStart && <p className="mb-0.5 ml-9 mt-1 text-xs font-medium text-muted">{sender?.name ?? "…"}</p>}
                  <div className={`group flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                    {!isDirect && !mine && (
                      <span className="w-7 shrink-0 self-end">
                        {runStart && <CharacterAvatar name={sender?.name ?? "?"} avatarUrl={sender?.avatarUrl ?? null} size={28} />}
                      </span>
                    )}
                    <div
                      onClick={() => setActiveId(activeId === m.id ? null : m.id)}
                      className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl text-[15px] ${
                        m.image_url ? "p-1" : "px-3.5 py-2"
                      } ${
                        mine
                          ? "rounded-br-md bg-accent-strong text-on-accent-strong"
                          : "rounded-bl-md bg-surface-2 text-fg"
                      } cursor-pointer ${m.pending ? "opacity-60" : ""} ${mentionsMe ? "ring-2 ring-accent/60" : ""}`}
                    >
                      {m.reply_to_id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (replyTarget) jumpTo(replyTarget.id);
                          }}
                          className={`mb-1 block w-full rounded-lg border-l-2 border-current/50 bg-black/10 px-2 py-1 text-left text-xs ${m.image_url ? "mx-1 mt-1 w-[calc(100%-0.5rem)]" : ""}`}
                        >
                          <span className="block font-semibold">{replyTarget ? nameOf(replyTarget.sender_id) : "Nachricht"}</span>
                          <span className="line-clamp-2 opacity-90">{replyTarget ? snippet(replyTarget) : "Nicht mehr vorhanden"}</span>
                        </button>
                      )}
                      {m.image_url && (
                        <ChatMedia url={m.image_url} />
                      )}
                      {m.content && (
                        <div className={m.image_url ? "px-2.5 pb-1 pt-1.5" : ""}>
                          {usernames.size > 0 && m.content.includes("@") ? (
                            splitMentions(m.content, usernames).map((part, idx) =>
                              part.mention ? (
                                <span key={idx} className="font-semibold underline decoration-dotted underline-offset-2">{part.text}</span>
                              ) : (
                                <SpoilerText key={idx} text={part.text} />
                              ),
                            )
                          ) : (
                            <SpoilerText text={m.content} />
                          )}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 pb-1 text-[10px] text-muted opacity-0 transition group-hover:opacity-100">
                      {time(m.created_at)}
                      {m.updated_at ? " · bearbeitet" : ""}
                    </span>
                    {!m.pending && (
                      <span
                        className={`flex shrink-0 items-center pb-0.5 transition ${
                          showActions ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTo(m);
                            setActiveId(null);
                            inputRef.current?.focus();
                          }}
                          aria-label="Antworten"
                          title="Antworten"
                          className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
                        >
                          <CornerUpLeft className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setReactFor(m.id)}
                          aria-label="Reagieren"
                          title="Reagieren"
                          className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
                        >
                          <SmilePlus className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void pin(m.id, !m.pinned_at)}
                          aria-label={m.pinned_at ? "Nicht mehr anheften" : "Anheften"}
                          title={m.pinned_at ? "Lösen" : "Anheften"}
                          className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
                        >
                          {m.pinned_at ? <PinOff className="h-3.5 w-3.5" strokeWidth={2} /> : <Pin className="h-3.5 w-3.5" strokeWidth={2} />}
                        </button>
                        {mine && (<>
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
                        </>)}
                      </span>
                    )}
                  </div>
                  {reactionChips && reactionChips.size > 0 && (
                    <div className={`mt-0.5 flex flex-wrap gap-1 ${mine ? "justify-end" : isDirect ? "" : "ml-9"}`}>
                      {[...reactionChips.entries()].map(([emoji, userIds]) => {
                        const reactedByMe = userIds.includes(userId);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => void toggleReaction(m.id, emoji)}
                            title={userIds.map(nameOf).join(", ")}
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ${
                              reactedByMe ? "bg-accent-strong/20 text-accent ring-1 ring-accent/40" : "bg-surface-2 text-fg-soft hover:bg-surface-3"
                            }`}
                          >
                            <EmojiText text={emoji} />
                            <span>{userIds.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  </>
                )}
                {seen && <p className="mt-0.5 text-right text-[10px] text-muted">Gelesen</p>}
                {readers > 0 && <p className="mt-0.5 text-right text-[10px] text-muted">Gelesen von {readers}</p>}
              </div>
            );
          })}
          <TypingLine names={typing.names.length ? (isDirect ? [title] : [typing.names.filter(Boolean).join(", ")]) : []} className="px-1 pt-1" />
        </div>
        <div ref={bottomRef} />
      </div>

      {(error || image.error) && <p className="pb-1 text-xs text-red-600 dark:text-red-400">{error ?? image.error}</p>}
      {image.pending && (
        <div className="relative mb-2 w-fit">
          <AttachmentPreview url={image.pending.previewUrl} />
          <button
            type="button"
            onClick={image.clear}
            title="Anhang entfernen"
            aria-label="Anhang entfernen"
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-fg text-app shadow"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      )}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-1.5 text-xs text-fg-soft">
          <CornerUpLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate">
            Antwort an <b className="font-semibold">{nameOf(replyTo.sender_id)}</b>: {snippet(replyTo)}
          </span>
          <button type="button" onClick={() => setReplyTo(null)} aria-label="Antwort abbrechen" className="shrink-0 text-muted hover:text-fg">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative flex items-end gap-2 border-t border-line py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <CustomEmojiPicker
          direction="up"
          className="flex h-10 w-10 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          onPick={(t) => setDraft((d) => d + t)}
        />
        <label
          title="Bild oder Video senden"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
        >
          <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
          <input type="file" accept="image/*,video/*" onChange={image.pick} className="hidden" />
        </label>
        {mentionMatches.length > 0 && (
          <div className="absolute bottom-full left-12 z-10 mb-1 w-64 max-w-[calc(100%-3rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            {mentionMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickMention(m.username!);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-surface-2"
              >
                <CharacterAvatar name={m.name} avatarUrl={m.avatarUrl} size={24} />
                <span className="truncate">{m.name}</span>
                <span className="truncate text-xs text-muted">@{m.username}</span>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={wrapSpoiler}
          disabled={!draft}
          aria-label="Als Spoiler verbergen"
          title="Als Spoiler verbergen"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg disabled:opacity-40"
        >
          <EyeOff className="h-5 w-5" strokeWidth={1.75} />
        </button>
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
      {reactFor && (
        <EmojiPickerDialog
          onClose={() => setReactFor(null)}
          onPick={(emoji) => {
            void toggleReaction(reactFor, emoji);
            setReactFor(null);
            setActiveId(null);
          }}
        />
      )}
      {pinsOpen && (
        <div role="dialog" aria-modal="true" aria-label="Angeheftete Nachrichten" onClick={() => setPinsOpen(false)} className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-serif text-lg text-fg">Angeheftet</h2>
              <button type="button" onClick={() => setPinsOpen(false)} aria-label="Schließen" className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <ul className="overflow-y-auto p-2">
              {pinned.map((m) => (
                <li key={m.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-2/60">
                  <button
                    type="button"
                    onClick={() => {
                      jumpTo(m.id);
                      setPinsOpen(false);
                    }}
                    className="flex min-w-0 flex-1 flex-col text-left"
                  >
                    <span className="text-xs text-muted">{nameOf(m.sender_id)} · {day(m.created_at)}</span>
                    <span className="truncate text-sm text-fg">{snippet(m)}</span>
                  </button>
                  <button type="button" onClick={() => void pin(m.id, false)} aria-label="Lösen" title="Lösen" className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
                    <PinOff className="h-4 w-4" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {membersOpen && !isDirect && (
        <GroupMembers
          chatId={chatId}
          kind={kind}
          title={title}
          avatarUrl={avatarUrl}
          members={members}
          userId={userId}
          isCreator={isCreator}
          addableFriends={addableFriends}
          worldId={worldId}
          onClose={() => setMembersOpen(false)}
        />
      )}
    </div>
  );
}
