"use client";

import { EmojiText } from "./custom-emoji-provider";
import { SpoilerText } from "./spoiler-text";
import { CustomEmojiPicker } from "./custom-emoji-picker";
import { useEffect, useRef, useState } from "react";
import { CornerUpLeft, ImagePlus, Quote, SendHorizontal, SmilePlus, X } from "lucide-react";
import { QuoteCard } from "./quote-card";
import type { ChatQuote } from "@/lib/clips";
import type { QuoteDraft } from "@/lib/scene-quote";
import { EmojiPickerDialog } from "./emoji-picker-dialog";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/chats/actions";
import { useAccountChat, type AccountMessage, type AccountReaction } from "@/lib/use-account-chat";
import { messagePreview } from "@/lib/chat-preview";
import { chatThemeStyle, type ChatTheme } from "@/lib/chat-theme";
import { useIsDark } from "@/lib/use-dark";
import { isSendKey, useEnterSends } from "@/lib/send-pref";
import { useTyping } from "@/lib/use-typing";
import { TypingLine } from "@/components/typing-line";
import { AttachmentPreview, ChatMedia } from "@/components/chat-media";
import { useImageDraft, uploadChatImage } from "@/lib/chat-image";

// Lädt die eigenen Chat-Farben (nur lesen; geändert wird im Vollbild-Chat).
function useChatThemeStyle(kind: "account" | "rp", chatId: string, userId: string) {
  const [theme, setTheme] = useState<ChatTheme | null>(null);
  const dark = useIsDark();
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("chat_themes")
      .select("main, accent, bg")
      .eq("user_id", userId)
      .eq("chat_kind", kind)
      .eq("chat_id", chatId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setTheme((data as ChatTheme | null) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, chatId, userId]);
  return chatThemeStyle(theme, dark);
}

type ThreadItem = {
  id: string;
  mine: boolean;
  name: string;
  avatarUrl: string | null;
  text: string;
  imageUrl?: string | null;
  pending?: boolean;
  // Antwort auf eine andere Nachricht (Name und Textanfang des Zitats) und Reaktionen (nur Redaktions-Chats)
  replyTo?: { name: string; text: string } | null;
  // Zitat aus der Szene (nur im Szenen-Chat)
  quote?: ChatQuote | null;
  reactions?: { emoji: string; count: number; mine: boolean; names: string }[];
};

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

type PickedImage = { file: File; previewUrl: string };

function MiniThread({
  items,
  error,
  showNames,
  onSend,
  onEdit,
  onDelete,
  onReact,
  typingNames = [],
  onTyping,
  quoteDraft = null,
  onClearQuote,
  onRestoreQuote,
}: {
  items: ThreadItem[];
  error: string | null;
  showNames: boolean;
  // Zitat aus der Szene, das mit der nächsten Nachricht mitgeschickt wird
  quoteDraft?: QuoteDraft | null;
  onClearQuote?: () => void;
  onRestoreQuote?: (draft: QuoteDraft) => void;
  // Mit onReact können Nachrichten beantwortet und mit Emojis bedacht werden
  onReact?: (id: string, emoji: string) => void;
  onSend: (text: string, image: PickedImage | null, replyToId?: string | null, quoteDraft?: QuoteDraft | null) => Promise<boolean>;
  typingNames?: string[];
  onTyping?: () => void;
  onEdit?: (id: string, text: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const enterSends = useEnterSends();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const image = useImageDraft();
  const [replyTo, setReplyTo] = useState<ThreadItem | null>(null);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Klebt die Ansicht am Ende, solange man unten ist. Nur die Nachrichtenliste scrollt (kein scrollIntoView: das schob die ganze Seite mit
  // und ließ sie hüpfen), und wachsen Bilder oder Zitate nach, rutscht die Liste mit nach unten.
  const stickRef = useRef(true);

  function toBottom() {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  useEffect(() => {
    stickRef.current = true;
    toBottom();
  }, [items.length, typingNames.length]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stickRef.current) toBottom();
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  function submit() {
    const text = draft;
    if (!text.trim() && !image.pending && !quoteDraft) return;
    const attached = image.take();
    const reply = replyTo;
    const quoted = quoteDraft;
    setDraft("");
    setReplyTo(null);
    onClearQuote?.();
    void onSend(text, attached, reply?.id, quoted).then((ok) => {
      if (ok) return;
      if (quoted) onRestoreQuote?.(quoted);
      setDraft((d) => d || text);
      setReplyTo((r) => r ?? reply);
      if (attached) image.restore(attached);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 [overflow-anchor:none]"
      >
        <div ref={contentRef}>
        {items.length === 0 && (
          <p className="py-6 text-center text-xs text-muted">
            Noch keine Nachrichten.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          {items.map((m, i) => {
            const prev = items[i - 1];
            const newSender =
              !prev || prev.mine !== m.mine || prev.name !== m.name;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}
              >
                {showNames && !m.mine && newSender && (
                  <span className="mb-0.5 px-1 text-[10px] text-muted">
                    {m.name}
                  </span>
                )}
                {editingId === m.id ? (
                  <div className="flex w-[85%] flex-col gap-1">
                    <textarea
                      value={editDraft}
                      autoFocus
                      rows={2}
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="resize-none rounded-2xl border border-accent bg-surface px-3 py-1.5 text-sm text-fg outline-none"
                    />
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-muted hover:text-fg"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        disabled={!editDraft.trim()}
                        onClick={() => {
                          onEdit?.(m.id, editDraft);
                          setEditingId(null);
                          setActiveId(null);
                        }}
                        className="font-medium text-accent disabled:opacity-40"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={
                      !m.pending && ((m.mine && onEdit) || onReact)
                        ? () => setActiveId(activeId === m.id ? null : m.id)
                        : undefined
                    }
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl text-sm ${
                      m.imageUrl ? "p-1" : "px-3 py-1.5"
                    } ${
                      m.mine
                        ? "rounded-br-md bg-accent-strong text-on-accent-strong"
                        : "rounded-bl-md bg-surface-2 text-fg"
                    } ${(m.mine && onEdit) || onReact ? "cursor-pointer" : ""} ${m.pending ? "opacity-60" : ""}`}
                  >
                    {m.replyTo && (
                      <div className={`mb-1 rounded-lg border-l-2 border-current/50 bg-black/10 px-2 py-1 text-xs ${m.imageUrl ? "mx-1 mt-1" : ""}`}>
                        <span className="block font-semibold">{m.replyTo.name}</span>
                        <span className="line-clamp-2 opacity-90">{m.replyTo.text}</span>
                      </div>
                    )}
                    {m.quote && <QuoteCard quote={m.quote} className={m.imageUrl ? "mx-1 mt-1" : ""} />}
                    {m.imageUrl && (
                      <ChatMedia url={m.imageUrl} size="sm" />
                    )}
                    {m.text && (
                      <div className={m.imageUrl ? "px-2 pb-0.5 pt-1" : ""}>
                        <SpoilerText text={m.text} />
                      </div>
                    )}
                  </div>
                )}
                {m.reactions && m.reactions.length > 0 && (
                  <div className={`mt-0.5 flex flex-wrap gap-1 ${m.mine ? "justify-end" : ""}`}>
                    {m.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        type="button"
                        title={r.names}
                        onClick={() => onReact?.(m.id, r.emoji)}
                        className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] transition ${
                          r.mine ? "bg-accent-strong/20 text-accent ring-1 ring-accent/40" : "bg-surface-2 text-fg-soft"
                        }`}
                      >
                        <EmojiText text={r.emoji} />
                        <span>{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}
                {activeId === m.id && editingId !== m.id && !m.pending && (
                  <div className="mt-1 flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px]">
                    {onReact && (
                      <>
                        <span className="flex items-center gap-0.5">
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                onReact(m.id, emoji);
                                setActiveId(null);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-sm transition hover:bg-surface-2"
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setEmojiFor(m.id)}
                            aria-label="Weitere Reaktionen"
                            title="Weitere Reaktionen"
                            className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
                          >
                            <SmilePlus className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTo(m);
                            setActiveId(null);
                          }}
                          className="flex items-center gap-1 text-muted hover:text-fg"
                        >
                          <CornerUpLeft className="h-3 w-3" strokeWidth={2} />
                          Antworten
                        </button>
                      </>
                    )}
                    {m.mine && onEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m.id);
                            setEditDraft(m.text);
                          }}
                          className="text-muted hover:text-fg"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            confirm("Diese Nachricht wirklich löschen?") &&
                            onDelete?.(m.id)
                          }
                          className="text-muted hover:text-red-500"
                        >
                          Löschen
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <TypingLine names={typingNames} className="px-1" />
        </div>
        </div>
      </div>
      {(error || image.error) && (
        <p className="px-3 pb-1 text-xs text-red-600 dark:text-red-400">
          {error ?? image.error}
        </p>
      )}
      {quoteDraft && (
        <div className="mx-2 mb-1 flex items-start gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-fg-soft">
          <Quote className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} />
          <QuoteCard quote={quoteDraft.quote} compact className="min-w-0 flex-1" />
          <button type="button" onClick={onClearQuote} aria-label="Zitat entfernen" className="shrink-0 text-muted hover:text-fg">
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}
      {replyTo && (
        <div className="mx-2 mb-1 flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1 text-xs text-fg-soft">
          <CornerUpLeft className="h-3 w-3 shrink-0" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate">
            Antwort an <b className="font-semibold">{replyTo.mine ? "dich" : replyTo.name || "…"}</b>: {replyTo.text || (replyTo.imageUrl ? "Anhang" : "")}
          </span>
          <button type="button" onClick={() => setReplyTo(null)} aria-label="Antwort abbrechen" className="shrink-0 text-muted hover:text-fg">
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}
      {image.pending && (
        <div className="relative mx-3 mb-2 w-fit">
          <AttachmentPreview url={image.pending.previewUrl} className="max-h-28" />
          <button
            type="button"
            onClick={image.clear}
            title="Anhang entfernen"
            aria-label="Anhang entfernen"
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-fg text-app shadow"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 border-t border-line p-2"
      >
        <CustomEmojiPicker
          className="flex h-9 w-9 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          onPick={(t) => setDraft((d) => d + t)}
        />
        <label
          title="Bild oder Video senden"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
        >
          <ImagePlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
          <input type="file" accept="image/*,video/*" onChange={image.pick} className="hidden" />
        </label>
        <textarea
          value={draft}
          rows={1}
          maxLength={4000}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value) onTyping?.();
          }}
          onKeyDown={(e) => {
            if (isSendKey(e, enterSends)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Nachricht…"
          className="max-h-24 min-h-9 flex-1 resize-none rounded-2xl border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!draft.trim() && !image.pending && !quoteDraft}
          aria-label="Senden"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong transition hover:opacity-90 disabled:opacity-40"
        >
          <SendHorizontal className="h-4 w-4" strokeWidth={2} />
        </button>
      </form>
      {emojiFor && onReact && (
        <EmojiPickerDialog
          onClose={() => setEmojiFor(null)}
          onPick={(emoji) => {
            onReact(emojiFor, emoji);
            setEmojiFor(null);
            setActiveId(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type AccountMember = { id: string; name: string; avatarUrl: string | null };

// Reaktionen einer Nachricht nach Emoji zusammenfassen (Anzahl, ob man selbst dabei ist, wer reagiert hat)
function groupReactions(rows: AccountReaction[], userId: string, nameOf: (id: string) => string) {
  const by = new Map<string, string[]>();
  for (const r of rows) by.set(r.emoji, [...(by.get(r.emoji) ?? []), r.user_id]);
  return [...by.entries()].map(([emoji, ids]) => ({ emoji, count: ids.length, mine: ids.includes(userId), names: ids.map(nameOf).join(", ") }));
}

function AccountThread({
  chatId,
  userId,
  initial,
  initialReactions,
  members,
  quoteDraft,
  onQuoteChange,
}: {
  chatId: string;
  userId: string;
  initial: AccountMessage[];
  initialReactions: AccountReaction[];
  members: AccountMember[];
  quoteDraft?: QuoteDraft | null;
  onQuoteChange?: (draft: QuoteDraft | null) => void;
}) {
  const names = new Map(members.map((m) => [m.id, m]));
  const grouped = members.length > 2;
  const { messages, reactions, error, send, edit, remove, toggleReaction } = useAccountChat(
    chatId,
    userId,
    initial,
    {},
    undefined,
    initialReactions,
  );
  const nameOf = (id: string) => (id === userId ? "Du" : (names.get(id)?.name ?? "Ehemaliges Mitglied"));
  const typing = useTyping(`account-typing-${chatId}`, userId, names.get(userId)?.name ?? "");
  const clearTyping = typing.clear;
  const lastIncomingId = [...messages].reverse().find((m) => m.sender_id !== userId)?.id;
  useEffect(() => {
    clearTyping();
  }, [lastIncomingId, clearTyping]);
  const items: ThreadItem[] = messages.map((m) => ({
    id: m.id,
    mine: m.sender_id === userId,
    name: grouped ? (names.get(m.sender_id)?.name ?? "Ehemaliges Mitglied") : "",
    avatarUrl: null,
    text: m.content,
    imageUrl: m.image_url,
    pending: m.pending,
    quote: m.quote ?? null,
    replyTo: m.reply_to_id
      ? (() => {
          const target = messages.find((x) => x.id === m.reply_to_id);
          return target
            ? { name: nameOf(target.sender_id), text: target.content.replace(/\s+/g, " ").trim().slice(0, 90) || (target.image_url ? "Anhang" : "") }
            : { name: "Nachricht", text: "Nicht mehr vorhanden" };
        })()
      : null,
    reactions: groupReactions(reactions.filter((r) => r.message_id === m.id), userId, nameOf),
  }));
  return (
    <MiniThread
      items={items}
      error={error}
      showNames={grouped}
      onReact={(id, emoji) => void toggleReaction(id, emoji)}
      typingNames={typing.names.length ? (grouped ? [typing.names.filter(Boolean).join(", ")] : [""]) : []}
      onTyping={typing.announce}
      onSend={send}
      quoteDraft={quoteDraft}
      onClearQuote={() => onQuoteChange?.(null)}
      onRestoreQuote={(d) => onQuoteChange?.(d)}
      onEdit={(id, t) => void edit(id, t)}
      onDelete={(id) => void remove(id)}
    />
  );
}

export function AccountMiniRoom({
  chatId,
  userId,
  quoteDraft,
  onQuoteChange,
}: {
  chatId: string;
  userId: string;
  // Zitat aus der Szene für die nächste Nachricht (nur im Chat einer Szene)
  quoteDraft?: QuoteDraft | null;
  onQuoteChange?: (draft: QuoteDraft | null) => void;
}) {
  const [initial, setInitial] = useState<AccountMessage[] | null>(null);
  const [initialReactions, setInitialReactions] = useState<AccountReaction[] | null>(null);
  const [members, setMembers] = useState<AccountMember[]>([]);
  const themeStyle = useChatThemeStyle("account", chatId, userId);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("account_messages")
      .select("id, sender_id, content, image_url, reply_to_id, pinned_at, mentioned_user_ids, quote, created_at, updated_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (!cancelled) setInitial([...(data ?? [])].reverse());
      });
    createClient()
      .from("account_message_reactions")
      .select("message_id, user_id, emoji, account_messages!inner(chat_id)")
      .eq("account_messages.chat_id", chatId)
      .returns<AccountReaction[]>()
      .then(({ data }) => {
        if (!cancelled) setInitialReactions((data ?? []).map((r) => ({ message_id: r.message_id, user_id: r.user_id, emoji: r.emoji })));
      });
    createClient()
      .from("account_chat_participants")
      .select("user_id, profiles(username, nickname, avatar_url)")
      .eq("chat_id", chatId)
      .returns<{ user_id: string; profiles: { username: string; nickname: string | null; avatar_url: string | null } | null }[]>()
      .then(({ data }) => {
        if (!cancelled)
          setMembers((data ?? []).map((p) => ({ id: p.user_id, name: p.profiles?.nickname || p.profiles?.username || "Unbekannt", avatarUrl: p.profiles?.avatar_url ?? null })));
      });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  if (!initial || !initialReactions)
    return <p className="p-6 text-center text-xs text-muted">Lädt…</p>;
  return (
    <div style={themeStyle} className="flex min-h-0 flex-1 flex-col text-fg">
      <AccountThread key={chatId} chatId={chatId} userId={userId} initial={initial} initialReactions={initialReactions} members={members} quoteDraft={quoteDraft} onQuoteChange={onQuoteChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------

type RpRow = {
  id: string;
  character_id: string;
  content: string;
  image_url: string | null;
  shared_post_id: string | null;
  story_id: string | null;
  created_at: string;
  pending?: boolean;
};
type Who = { id: string; name: string; avatar_url: string | null };

function RpThread({
  chatId,
  userId,
  activeCharacterId,
  people,
  initial,
}: {
  chatId: string;
  userId: string;
  activeCharacterId: string;
  people: Record<string, Who>;
  initial: RpRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const typing = useTyping(`chat-${chatId}`, activeCharacterId, people[activeCharacterId]?.name ?? "");

  useEffect(() => {
    const supabase = createClient();
    const markRead = () =>
      supabase
        .from("chat_reads")
        .upsert({
          chat_id: chatId,
          user_id: userId,
          last_read_at: new Date().toISOString(),
        })
        .then();
    markRead();
    const channel = supabase
      .channel(`bubble-rp-${chatId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const row = payload.new as RpRow;
          setRows((prev) =>
            prev.some((m) => m.id === row.id)
              ? prev.map((m) => (m.id === row.id ? row : m))
              : [...prev, row],
          );
          if (document.visibilityState === "visible") markRead();
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) setRows((prev) => prev.filter((m) => m.id !== id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, userId]);

  async function send(text: string, image: PickedImage | null): Promise<boolean> {
    const content = text.trim();
    if (!content && !image) return false;
    const id = crypto.randomUUID();
    setError(null);
    setRows((prev) => [
      ...prev,
      {
        id,
        character_id: activeCharacterId,
        content,
        image_url: image?.previewUrl ?? null,
        shared_post_id: null,
        story_id: null,
        created_at: new Date().toISOString(),
        pending: true,
      },
    ]);
    const fail = (message: string) => {
      setRows((prev) => prev.filter((m) => m.id !== id));
      setError(message);
      return false;
    };
    let imageUrl: string | null = null;
    if (image) {
      const uploaded = await uploadChatImage(chatId, image.file);
      if ("error" in uploaded) return fail(uploaded.error);
      imageUrl = uploaded.url;
    }
    const err = await sendMessage(chatId, activeCharacterId, content, imageUrl, {
      id,
    });
    if (err) return fail(err);
    setRows((prev) =>
      prev.map((m) => (m.id === id ? { ...m, pending: false, image_url: imageUrl ?? m.image_url } : m)),
    );
    if (image) URL.revokeObjectURL(image.previewUrl);
    return true;
  }

  const items: ThreadItem[] = rows.map((m) => ({
    id: m.id,
    mine: m.character_id === activeCharacterId,
    name: people[m.character_id]?.name ?? "?",
    avatarUrl: people[m.character_id]?.avatar_url ?? null,
    text: m.image_url && !m.content.trim() ? "" : messagePreview(m),
    imageUrl: m.image_url,
    pending: m.pending,
  }));
  return (
    <MiniThread
      items={items}
      error={error}
      showNames={Object.keys(people).length > 2}
      typingNames={typing.names}
      onTyping={typing.announce}
      onSend={send}
    />
  );
}

export function RpMiniRoom({
  chatId,
  userId,
  activeCharacterId,
}: {
  chatId: string;
  userId: string;
  activeCharacterId: string;
}) {
  const [state, setState] = useState<{
    rows: RpRow[];
    people: Record<string, Who>;
  } | null>(null);
  const themeStyle = useChatThemeStyle("rp", chatId, userId);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase
        .from("messages")
        .select(
          "id, character_id, content, image_url, shared_post_id, story_id, created_at",
        )
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("chat_participants")
        .select("characters(id, name, avatar_url)")
        .eq("chat_id", chatId),
    ]).then(([{ data: rows }, { data: parts }]) => {
      if (cancelled) return;
      const people: Record<string, Who> = {};
      for (const p of (parts ?? []) as unknown as { characters: Who }[])
        people[p.characters.id] = p.characters;
      setState({ rows: [...((rows ?? []) as RpRow[])].reverse(), people });
    });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  if (!state)
    return <p className="p-6 text-center text-xs text-muted">Lädt…</p>;
  return (
    <div style={themeStyle} className="flex min-h-0 flex-1 flex-col text-fg">
      <RpThread
        key={chatId}
        chatId={chatId}
        userId={userId}
        activeCharacterId={activeCharacterId}
        people={state.people}
        initial={state.rows}
      />
    </div>
  );
}
