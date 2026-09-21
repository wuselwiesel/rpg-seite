"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, Check, ChevronLeft, CornerUpLeft, ImagePlus, Pencil, Trash2, UserPlus, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CharacterAvatar } from "@/components/character-avatar";
import { AvatarUpload } from "@/components/avatar-upload";
import { resizeImage } from "@/lib/image-resize";
import { aggregateReactions } from "@/lib/reactions";
import { addChatParticipant, deleteChat, deleteMessage, renameChat, sendMessage, setChatMuted, updateMessage } from "../actions";
import { GifPicker } from "@/components/gif-picker";
import { encodeMentionsInText, findMentionQuery, firstName, type MentionQuery } from "@/components/mention-textarea";
import { MENTION_REGEX, plainMentions } from "@/lib/mentions";
import { MessageBubble } from "./message-bubble";
import type { Character, Message } from "@/lib/types";

export function ChatRoom({
  chatId,
  userId,
  title,
  isGroup,
  avatarUrl,
  canDelete,
  participants,
  availableCharacters,
  initialMessages,
  activeCharacter,
  myCharacterIds,
  initialReads,
  initialMuted,
}: {
  chatId: string;
  userId: string;
  title: string;
  isGroup: boolean;
  avatarUrl: string | null;
  canDelete: boolean;
  participants: Character[];
  availableCharacters: Character[];
  initialMessages: Message[];
  activeCharacter: Character;
  myCharacterIds: string[];
  // Lesezeitpunkte der anderen Teilnehmer:innen (für "Gelesen")
  initialReads: { user_id: string; last_read_at: string }[];
  initialMuted: boolean;
}) {
  // Reaktionen gehören dem aktiven Charakter: nur seine zählen als "von mir".
  const myCharacterIdSet = new Set([activeCharacter.id]);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [reads, setReads] = useState(initialReads);
  const [muted, setMuted] = useState(initialMuted);
  const [gifOpen, setGifOpen] = useState(false);
  const [mentions, setMentions] = useState<{ name: string; id: string }[]>([]);
  const [editMentions, setEditMentions] = useState<{ name: string; id: string }[]>([]);
  const [mentionQuery, setMentionQuery] = useState<MentionQuery | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Entwurf pro Chat im Browser merken (übersteht Tab-Wechsel und Neuladen).
  const draftKey = `draft:chat:${chatId}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) Promise.resolve().then(() => setDraft((d) => d || saved));
    } catch {
      // ignore
    }
  }, [draftKey]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (draft.trim()) localStorage.setItem(draftKey, draft);
        else localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, draftKey]);
  const [typing, setTyping] = useState<Record<string, { name: string; until: number }>>({});
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const lastTypingSent = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const addAction = addChatParticipant.bind(null, chatId);
  const [addError, addFormAction, addPending] = useActionState(addAction, null);
  const renameAction = renameChat.bind(null, chatId);
  const [renameError, renameFormAction, renamePending] = useActionState(renameAction, null);
  const wasRenamePending = useRef(false);

  useEffect(() => {
    if (wasRenamePending.current && !renamePending && !renameError) setRenaming(false);
    wasRenamePending.current = renamePending;
  }, [renamePending, renameError]);

  function markAsRead() {
    supabase
      .from("chat_reads")
      .upsert({ chat_id: chatId, user_id: userId, last_read_at: new Date().toISOString() })
      .then();
  }

  // Zusatzdaten (geteilter Beitrag / Story) einer neu eingetroffenen Nachricht nachladen.
  async function loadExtras(row: Omit<Message, "characters">) {
    const patch: Partial<Message> = {};
    if (row.shared_post_id) {
      const { data } = await supabase
        .from("posts")
        .select("id, content, media_url, media_type, media_urls, characters!posts_character_id_fkey(name, username, avatar_url)")
        .eq("id", row.shared_post_id)
        .maybeSingle();
      if (data) patch.shared_post = data as unknown as Message["shared_post"];
    }
    if (row.story_id) {
      const { data } = await supabase
        .from("stories")
        .select("id, image_url, video_url, bg, text_content, expires_at")
        .eq("id", row.story_id)
        .maybeSingle();
      if (data) patch.story = data as Message["story"];
    }
    if (Object.keys(patch).length) {
      setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...patch } : m)));
    }
  }

  useEffect(() => {
    markAsRead();

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const row = payload.new as Omit<Message, "characters">;
          const character = participants.find((p) => p.id === row.character_id) ?? null;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id)
              ? // bereits optimistisch angezeigt: als zugestellt markieren
                prev.map((m) => (m.id === row.id ? { ...m, ...row, characters: m.characters ?? character, pending: false } : m))
              : [...prev, { ...row, characters: character }],
          );
          if (row.shared_post_id || row.story_id) loadExtras(row);
          if (!myCharacterIds.includes(row.character_id)) {
            markAsRead();
            setTyping((prev) => {
              const next = { ...prev };
              delete next[row.character_id];
              return next;
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const row = payload.new as Omit<Message, "characters">;
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== row.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reads", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const row = payload.new as { user_id?: string; last_read_at?: string };
          if (!row.user_id || row.user_id === userId || !row.last_read_at) return;
          setReads((prev) => [...prev.filter((r) => r.user_id !== row.user_id), { user_id: row.user_id!, last_read_at: row.last_read_at! }]);
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { characterId, name } = payload as { characterId: string; name: string };
        setTyping((prev) => ({ ...prev, [characterId]: { name, until: Date.now() + 4000 } }));
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // "schreibt gerade..." verschwindet nach ein paar Sekunden ohne neues Signal.
  useEffect(() => {
    if (Object.keys(typing).length === 0) return;
    const timer = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const next = Object.fromEntries(Object.entries(prev).filter(([, v]) => v.until > now));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [typing]);

  function announceTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { characterId: activeCharacter.id, name: activeCharacter.name },
    });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const wasAddPending = useRef(false);
  useEffect(() => {
    if (wasAddPending.current && !addPending && !addError) setShowAddForm(false);
    wasAddPending.current = addPending;
  }, [addPending, addError]);

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Nur Bilder können gesendet werden.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setImageError("Bild ist zu groß (max. 25 MB).");
      return;
    }
    setImageError(null);
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
  }

  function clearImage() {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = encodeMentionsInText(draft.trim(), mentions);
    if ((!content && !pendingImage) || sending) return;

    const id = crypto.randomUUID();
    const reply = replyTo;
    const previousImage = pendingImage;
    setImageError(null);

    // Sofort anzeigen (optimistisch), Bild-Upload und Server laufen im Hintergrund.
    setMessages((prev) => [
      ...prev,
      {
        id,
        chat_id: chatId,
        character_id: activeCharacter.id,
        content,
        image_url: previousImage?.previewUrl ?? null,
        reply_to_id: reply?.id ?? null,
        created_at: new Date().toISOString(),
        characters: activeCharacter,
        reactions: [],
        pending: true,
      },
    ]);
    setDraft("");
    setMentions([]);
    setMentionQuery(null);
    setReplyTo(null);
    setPendingImage(null);

    function fail(message: string) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setDraft(plainMentions(content));
      setReplyTo(reply);
      setPendingImage(previousImage);
      setImageError(message);
    }

    let imageUrl: string | null = null;
    if (previousImage) {
      setSending(true);
      const file = await resizeImage(previousImage.file);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${chatId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("chat-media").upload(path, file);
      setSending(false);
      if (uploadError) return fail(uploadError.message);
      imageUrl = supabase.storage.from("chat-media").getPublicUrl(path).data.publicUrl;
    }

    const error = await sendMessage(chatId, activeCharacter.id, content, imageUrl, {
      id,
      replyToId: reply?.id ?? null,
    });
    if (error) return fail(error);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pending: false, image_url: imageUrl ?? m.image_url } : m)));
    if (previousImage) URL.revokeObjectURL(previousImage.previewUrl);
  }

  // "Gelesen" unter der letzten eigenen Nachricht (1:1) bzw. "Gelesen von N" (Gruppen).
  function receiptLabel(message: Message) {
    if (message.pending) return "Wird gesendet…";
    const otherOwners = new Set(participants.map((p) => p.owner_id).filter((o) => o !== userId));
    if (otherOwners.size === 0) return "Gesendet";
    const readers = reads.filter(
      (r) => otherOwners.has(r.user_id) && new Date(r.last_read_at) >= new Date(message.created_at),
    ).length;
    if (readers === 0) return "Gesendet";
    return otherOwners.size === 1 ? "Gelesen" : `Gelesen von ${readers}`;
  }

  async function sendGif(url: string) {
    setGifOpen(false);
    const id = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id,
        chat_id: chatId,
        character_id: activeCharacter.id,
        content: "",
        image_url: url,
        created_at: new Date().toISOString(),
        characters: activeCharacter,
        reactions: [],
        pending: true,
      },
    ]);
    const error = await sendMessage(chatId, activeCharacter.id, "", url, { id });
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setImageError(error);
      return;
    }
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pending: false } : m)));
  }

  async function toggleMute() {
    const next = !muted;
    setMuted(next);
    const error = await setChatMuted(chatId, next);
    if (error) {
      setMuted(!next);
      alert(error);
    }
  }

  // @-Vorschläge: die anderen Teilnehmer:innen dieses Chats.
  const mentionCandidates = participants.filter((p) => p.id !== activeCharacter.id);
  const mentionMatches = mentionQuery
    ? mentionCandidates.filter((c) => c.name.toLowerCase().includes(mentionQuery.query.toLowerCase())).slice(0, 6)
    : [];

  function pickMention(character: Character) {
    if (!mentionQuery) return;
    const cursor = inputRef.current?.selectionStart ?? draft.length;
    const name = firstName(character.name);
    const inserted = `@${name} `;
    const next = draft.slice(0, mentionQuery.start) + inserted + draft.slice(cursor);
    setDraft(next);
    setMentions((prev) => [...prev, { name, id: character.id }]);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = mentionQuery.start + inserted.length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    });
  }

  async function handleDeleteChat() {
    const text = isGroup
      ? "Diesen Gruppenchat mit allen Nachrichten für alle löschen? Das kann nicht rückgängig gemacht werden."
      : "Diesen Chat mit allen Nachrichten löschen? Das kann nicht rückgängig gemacht werden.";
    if (!confirm(text)) return;
    const error = await deleteChat(chatId);
    if (error) alert(error);
  }

  function startEdit(message: Message) {
    setEditingId(message.id);
    setEditDraft(plainMentions(message.content));
    setEditMentions(Array.from(message.content.matchAll(MENTION_REGEX), (m) => ({ name: m[1], id: m[2] })));
  }

  async function handleSaveEdit(messageId: string) {
    const content = encodeMentionsInText(editDraft.trim(), editMentions);
    if (!content) return;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content } : m)));
    setEditingId(null);
    const error = await updateMessage(messageId, content);
    if (error) alert(error);
  }

  async function handleDelete(messageId: string) {
    if (!confirm("Diese Nachricht wirklich löschen?")) return;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    const error = await deleteMessage(messageId, chatId);
    if (error) alert(error);
  }

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col px-4 lg:h-dvh lg:max-w-none lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line py-3 lg:py-4">
        <div className="flex min-w-0 items-center gap-1">
          <Link
            href="/chats"
            aria-label="Zurück zu allen Chats"
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg transition hover:bg-surface-2 active:bg-surface-3 lg:hidden"
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={2} />
          </Link>
          <div className="min-w-0">
          {renaming ? (
            <form action={renameFormAction} className="flex flex-col gap-2">
              <AvatarUpload name="avatar_url" displayName={title} initialUrl={avatarUrl} />
              <div className="flex items-center gap-1">
                <input
                  name="name"
                  defaultValue={title}
                  autoFocus
                  required
                  className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 font-serif text-xl text-fg outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={renamePending}
                  title="Speichern"
                  className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-accent disabled:opacity-50"
                >
                  <Check className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  title="Abbrechen"
                  className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              {isGroup && <CharacterAvatar name={title} avatarUrl={avatarUrl} size={36} />}
              <h1 className="truncate font-serif text-2xl text-fg">{title}</h1>
              {isGroup && (
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  title="Gruppenname und Bild ändern"
                  className="shrink-0 rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
          )}
          {renameError && <p className="text-xs text-red-600 dark:text-red-400">{renameError}</p>}
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <p className="min-w-0 truncate text-right text-xs text-muted">
            {participants.map((p) => p.name).join(", ")}
          </p>
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={muted}
            title={muted ? "Stumm: nur @-Erwähnungen melden sich. Tippen zum Aufheben" : "Stumm schalten (nur @-Erwähnungen melden sich)"}
            className={`shrink-0 rounded-full p-1.5 transition hover:bg-surface-2 ${muted ? "text-accent" : "text-muted hover:text-fg"}`}
          >
            {muted ? <BellOff className="h-4 w-4" strokeWidth={2} /> : <Bell className="h-4 w-4" strokeWidth={2} />}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={handleDeleteChat}
              title="Chat löschen"
              className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
          {isGroup && availableCharacters.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              title="Charakter hinzufügen"
              className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <UserPlus className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
          {!isGroup && (
            <Link
              href={`/chats/new?with=${participants
                .filter((p) => p.id !== activeCharacter.id)
                .map((p) => p.id)
                .join(",")}`}
              title="Neuen Gruppenchat erstellen"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg-soft transition hover:bg-surface-3 hover:text-fg"
            >
              <Users className="h-4 w-4" strokeWidth={2} />
              Gruppe erstellen
            </Link>
          )}
        </div>
      </div>

      {showAddForm && (
        <form action={addFormAction} className="flex flex-col gap-2 border-b border-line py-3">
          <div className="flex items-center gap-2">
            <select
              name="character_id"
              required
              className="flex-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-accent"
            >
              {availableCharacters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={addPending}
              className="shrink-0 rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
            >
              {addPending ? "..." : "Hinzufügen"}
            </button>
          </div>
          {addError && <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>}
        </form>
      )}

      <div className="flex-1 overflow-y-auto py-4">
        <div className="flex flex-col gap-3">
          {messages.map((message, index) => {
            const isOwn = message.character_id === activeCharacter.id;
            const isLast = index === messages.length - 1;
            return (
              <div key={message.id} className="flex flex-col">
                <MessageBubble
                  message={message}
                  isOwn={isOwn}
                  activeCharacter={activeCharacter}
                  replyTarget={message.reply_to_id ? messages.find((m) => m.id === message.reply_to_id) : undefined}
                  reactions={aggregateReactions(message.reactions, myCharacterIdSet)}
                  editing={editingId === message.id}
                  editDraft={editDraft}
                  onEditDraft={setEditDraft}
                  onStartEdit={() => startEdit(message)}
                  onSaveEdit={() => handleSaveEdit(message.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => handleDelete(message.id)}
                  onReply={() => setReplyTo(message)}
                />
                {isLast && myCharacterIds.includes(message.character_id) && (
                  <p className="mt-1 text-right text-[11px] text-muted">{receiptLabel(message)}</p>
                )}
              </div>
            );
          })}
          {Object.keys(typing).length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted" role="status">
              <span className="flex gap-0.5">
                <span className="typing-dot" />
                <span className="typing-dot [animation-delay:150ms]" />
                <span className="typing-dot [animation-delay:300ms]" />
              </span>
              {Object.values(typing).map((t) => t.name).join(", ")} schreibt…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 border-t border-line pt-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        {replyTo && (
          <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-fg-soft">
            <CornerUpLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="min-w-0 flex-1 truncate">
              Antwort an <b className="font-semibold">{replyTo.characters?.name}</b>: {plainMentions(replyTo.content) || "Foto"}
            </span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Antwort abbrechen" className="shrink-0 text-muted hover:text-fg">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
        {pendingImage && (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImage.previewUrl} alt="Vorschau" className="max-h-40 max-w-full rounded-md object-contain" />
            <button
              type="button"
              onClick={clearImage}
              title="Bild entfernen"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-fg text-app shadow"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        )}
        {imageError && <p className="text-xs text-red-600 dark:text-red-400">{imageError}</p>}
        <div className="relative flex gap-2">
          {gifOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 sm:right-auto">
              <GifPicker onPick={sendGif} onClose={() => setGifOpen(false)} />
            </div>
          )}
          {mentionQuery && mentionMatches.length > 0 && (
            <div className="absolute bottom-full left-10 z-10 mb-2 w-64 max-w-[calc(100%-2.5rem)] overflow-hidden rounded-md border border-line bg-surface shadow-lg">
              {mentionMatches.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickMention(c);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                    i === mentionIndex ? "bg-surface-2 text-fg" : "text-fg-soft hover:bg-surface-2"
                  }`}
                >
                  <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={24} />
                  {c.name}
                </button>
              ))}
            </div>
          )}
          <label
            title="Bild senden"
            className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-line px-2.5 text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
            <input type="file" accept="image/*" onChange={pickImage} className="hidden" />
          </label>
          <button
            type="button"
            onClick={() => setGifOpen((v) => !v)}
            aria-expanded={gifOpen}
            title="GIF senden"
            className="shrink-0 rounded-md border border-line px-2.5 text-xs font-bold tracking-wide text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            GIF
          </button>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setMentionQuery(findMentionQuery(e.target.value, e.target.selectionStart ?? e.target.value.length));
              setMentionIndex(0);
              if (e.target.value) announceTyping();
            }}
            onKeyDown={(e) => {
              if (!mentionQuery || mentionMatches.length === 0) return;
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex((i) => (i + (e.key === "ArrowDown" ? 1 : mentionMatches.length - 1)) % mentionMatches.length);
              } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                pickMention(mentionMatches[mentionIndex]);
              } else if (e.key === "Escape") {
                setMentionQuery(null);
              }
            }}
            placeholder={`Schreib als ${activeCharacter.name}... (@ zum Erwähnen)`}
            className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
          />
          <button
            type="submit"
            disabled={sending || (!draft.trim() && !pendingImage)}
            className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:bg-surface-2 disabled:text-muted disabled:opacity-100"
          >
            Senden
          </button>
        </div>
      </form>
    </div>
  );
}
