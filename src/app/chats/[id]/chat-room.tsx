"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ImagePlus, Pencil, Trash2, UserPlus, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CharacterAvatar } from "@/components/character-avatar";
import { ReactionBar } from "@/components/reaction-bar";
import { AvatarUpload } from "@/components/avatar-upload";
import { formatDateTime } from "@/lib/format";
import { aggregateReactions } from "@/lib/reactions";
import { addChatParticipant, deleteChat, deleteMessage, renameChat, sendMessage, updateMessage } from "../actions";
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
}) {
  const myCharacterIdSet = new Set(myCharacterIds);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
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
            prev.some((m) => m.id === row.id) ? prev : [...prev, { ...row, characters: character }],
          );
          if (!myCharacterIds.includes(row.character_id)) markAsRead();
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

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
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Bild ist zu groß (max. 5 MB).");
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
    const content = draft.trim();
    if ((!content && !pendingImage) || sending) return;

    setSending(true);
    setImageError(null);
    let imageUrl: string | null = null;

    if (pendingImage) {
      const ext = pendingImage.file.name.split(".").pop() || "jpg";
      const path = `${chatId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("chat-media").upload(path, pendingImage.file);
      if (uploadError) {
        setImageError(uploadError.message);
        setSending(false);
        return;
      }
      imageUrl = supabase.storage.from("chat-media").getPublicUrl(path).data.publicUrl;
    }

    const previousImage = pendingImage;
    setDraft("");
    setPendingImage(null);
    const error = await sendMessage(chatId, activeCharacter.id, content, imageUrl);
    setSending(false);

    if (error) {
      setDraft(content);
      setPendingImage(previousImage);
      alert(error);
    } else if (previousImage) {
      URL.revokeObjectURL(previousImage.previewUrl);
    }
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
    setEditDraft(message.content);
  }

  async function handleSaveEdit(messageId: string) {
    const content = editDraft.trim();
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
          {messages.map((message) => {
            const isOwn = message.character_id === activeCharacter.id;
            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                <CharacterAvatar
                  name={message.characters?.name ?? "?"}
                  avatarUrl={message.characters?.avatar_url}
                  size={28}
                />
                <div
                  className={`group max-w-[75%] rounded-lg px-3 py-2 ${
                    isOwn ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg"
                  }`}
                >
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <p className="text-xs">
                      {message.characters?.name} · {formatDateTime(message.created_at)}
                      {message.updated_at && " · bearbeitet"}
                    </p>
                    {isOwn && editingId !== message.id && (
                      <span className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startEdit(message)}
                          title="Bearbeiten"
                          className="rounded p-0.5 hover:bg-black/10"
                        >
                          <Pencil className="h-3 w-3" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(message.id)}
                          title="Löschen"
                          className="rounded p-0.5 hover:bg-black/10"
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={2} />
                        </button>
                      </span>
                    )}
                  </div>
                  {editingId === message.id ? (
                    <div className="flex flex-col gap-1.5">
                      <input
                        type="text"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(message.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="rounded-md border border-line bg-app px-2 py-1 text-sm text-fg outline-none focus:border-accent"
                      />
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(message.id)}
                          className="hover:underline"
                        >
                          Speichern
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="opacity-90 hover:underline">
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {message.image_url && (
                        <a href={message.image_url} target="_blank" rel="noreferrer" className="mb-1 block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={message.image_url}
                            alt="Gesendetes Bild"
                            className="max-h-72 max-w-full rounded-md object-cover"
                          />
                        </a>
                      )}
                      {message.content && (
                        <p className="text-[15px] leading-relaxed whitespace-pre-line">{message.content}</p>
                      )}
                    </>
                  )}
                  {editingId !== message.id && (
                    <div className="mt-1.5">
                      <ReactionBar
                        onBubble
                        target={{ messageId: message.id, characterId: activeCharacter.id }}
                        initialReactions={aggregateReactions(message.reactions, myCharacterIdSet)}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 border-t border-line pt-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        {pendingImage && (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImage.previewUrl} alt="Vorschau" className="max-h-32 rounded-md object-cover" />
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
        <div className="flex gap-2">
          <label
            title="Bild senden"
            className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-line px-2.5 text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
            <input type="file" accept="image/*" onChange={pickImage} className="hidden" />
          </label>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Schreib als ${activeCharacter.name}...`}
            className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
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
