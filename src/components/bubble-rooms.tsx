"use client";

import { EmojiText } from "./custom-emoji-provider";
import { CustomEmojiPicker } from "./custom-emoji-picker";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, SendHorizontal, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/chats/actions";
import { useAccountChat, type AccountMessage } from "@/lib/use-account-chat";
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
};

type PickedImage = { file: File; previewUrl: string };

function MiniThread({
  items,
  error,
  showNames,
  onSend,
  onEdit,
  onDelete,
  typingNames = [],
  onTyping,
}: {
  items: ThreadItem[];
  error: string | null;
  showNames: boolean;
  onSend: (text: string, image: PickedImage | null) => Promise<boolean>;
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [items.length, typingNames.length]);

  function submit() {
    const text = draft;
    if (!text.trim() && !image.pending) return;
    const attached = image.take();
    setDraft("");
    void onSend(text, attached).then((ok) => {
      if (ok) return;
      setDraft((d) => d || text);
      if (attached) image.restore(attached);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-3 py-3">
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
                      m.mine && onEdit && !m.pending
                        ? () => setActiveId(activeId === m.id ? null : m.id)
                        : undefined
                    }
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl text-sm ${
                      m.imageUrl ? "p-1" : "px-3 py-1.5"
                    } ${
                      m.mine
                        ? "rounded-br-md bg-accent-strong text-on-accent-strong"
                        : "rounded-bl-md bg-surface-2 text-fg"
                    } ${m.mine && onEdit ? "cursor-pointer" : ""} ${m.pending ? "opacity-60" : ""}`}
                  >
                    {m.imageUrl && (
                      <ChatMedia url={m.imageUrl} size="sm" />
                    )}
                    {m.text && (
                      <div className={m.imageUrl ? "px-2 pb-0.5 pt-1" : ""}>
                        <EmojiText text={m.text} />
                      </div>
                    )}
                  </div>
                )}
                {m.mine &&
                  onEdit &&
                  activeId === m.id &&
                  editingId !== m.id && (
                    <div className="mt-0.5 flex gap-3 px-1 text-[11px]">
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
                    </div>
                  )}
              </div>
            );
          })}
          <TypingLine names={typingNames} className="px-1" />
        </div>
        <div ref={bottomRef} />
      </div>
      {(error || image.error) && (
        <p className="px-3 pb-1 text-xs text-red-600 dark:text-red-400">
          {error ?? image.error}
        </p>
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
          disabled={!draft.trim() && !image.pending}
          aria-label="Senden"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong transition hover:opacity-90 disabled:opacity-40"
        >
          <SendHorizontal className="h-4 w-4" strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------

type AccountMember = { id: string; name: string; avatarUrl: string | null };

function AccountThread({
  chatId,
  userId,
  initial,
  members,
}: {
  chatId: string;
  userId: string;
  initial: AccountMessage[];
  members: AccountMember[];
}) {
  const names = new Map(members.map((m) => [m.id, m]));
  const grouped = members.length > 2;
  const { messages, error, send, edit, remove } = useAccountChat(
    chatId,
    userId,
    initial,
    null,
  );
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
  }));
  return (
    <MiniThread
      items={items}
      error={error}
      showNames={grouped}
      typingNames={typing.names.length ? (grouped ? [typing.names.filter(Boolean).join(", ")] : [""]) : []}
      onTyping={typing.announce}
      onSend={send}
      onEdit={(id, t) => void edit(id, t)}
      onDelete={(id) => void remove(id)}
    />
  );
}

export function AccountMiniRoom({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}) {
  const [initial, setInitial] = useState<AccountMessage[] | null>(null);
  const [members, setMembers] = useState<AccountMember[]>([]);
  const themeStyle = useChatThemeStyle("account", chatId, userId);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("account_messages")
      .select("id, sender_id, content, image_url, created_at, updated_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (!cancelled) setInitial([...(data ?? [])].reverse());
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

  if (!initial)
    return <p className="p-6 text-center text-xs text-muted">Lädt…</p>;
  return (
    <div style={themeStyle} className="flex min-h-0 flex-1 flex-col text-fg">
      <AccountThread key={chatId} chatId={chatId} userId={userId} initial={initial} members={members} />
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
