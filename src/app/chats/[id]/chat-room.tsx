"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CharacterAvatar } from "@/components/character-avatar";
import { ReactionBar } from "@/components/reaction-bar";
import { formatDateTime } from "@/lib/format";
import { aggregateReactions } from "@/lib/reactions";
import { addChatParticipant, deleteMessage, sendMessage, updateMessage } from "../actions";
import type { Character, Message } from "@/lib/types";

export function ChatRoom({
  chatId,
  userId,
  title,
  participants,
  availableCharacters,
  initialMessages,
  activeCharacter,
  myCharacterIds,
}: {
  chatId: string;
  userId: string;
  title: string;
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const addAction = addChatParticipant.bind(null, chatId);
  const [addError, addFormAction, addPending] = useActionState(addAction, null);

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
          markAsRead();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setDraft("");
    const error = await sendMessage(chatId, activeCharacter.id, content);
    setSending(false);

    if (error) {
      setDraft(content);
      alert(error);
    }
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
    <div className="mx-auto flex h-dvh max-w-2xl flex-col px-4 lg:h-screen">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line py-4">
        <div className="min-w-0">
          <Link href="/chats" className="text-xs text-muted hover:text-fg-soft">
            ← Alle Chats
          </Link>
          <h1 className="truncate font-serif text-2xl text-fg">{title}</h1>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <p className="min-w-0 truncate text-right text-xs text-muted">
            {participants.map((p) => p.name).join(", ")}
          </p>
          {availableCharacters.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              title="Charakter hinzufügen"
              className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <UserPlus className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {showAddForm && (
        <form action={addFormAction} className="flex items-center gap-2 border-b border-line py-3">
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
                    <p className="text-xs opacity-70">
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
                          className="opacity-90 hover:underline"
                        >
                          Speichern
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="opacity-70 hover:underline">
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                  )}
                  {editingId !== message.id && (
                    <div className="mt-1.5">
                      <ReactionBar
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
        className="flex gap-2 border-t border-line pt-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Schreib als ${activeCharacter.name}...`}
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          Senden
        </button>
      </form>
    </div>
  );
}
