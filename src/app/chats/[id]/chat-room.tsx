"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CharacterAvatar } from "@/components/character-avatar";
import { formatDateTime } from "@/lib/format";
import type { Character, Message } from "@/lib/types";

export function ChatRoom({
  chatId,
  userId,
  title,
  participants,
  initialMessages,
  activeCharacter,
}: {
  chatId: string;
  userId: string;
  title: string;
  participants: Character[];
  initialMessages: Message[];
  activeCharacter: Character;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setDraft("");
    const { error } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, character_id: activeCharacter.id, content });
    setSending(false);

    if (error) {
      setDraft(content);
      alert(error.message);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-57px)] max-w-2xl flex-col px-4">
      <div className="flex items-center justify-between border-b border-stone-800 py-4">
        <div>
          <Link href="/chats" className="text-xs text-stone-500 hover:text-stone-300">
            ← Alle Chats
          </Link>
          <h1 className="font-serif text-2xl text-stone-100">{title}</h1>
        </div>
        <p className="text-xs text-stone-500">
          {participants.map((p) => p.name).join(", ")}
        </p>
      </div>

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
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    isOwn ? "bg-amber-800/70 text-stone-50" : "bg-stone-800 text-stone-100"
                  }`}
                >
                  <p className="mb-0.5 text-xs opacity-70">
                    {message.characters?.name} · {formatDateTime(message.created_at)}
                  </p>
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-stone-800 py-4">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Schreib als ${activeCharacter.name}...`}
          className="flex-1 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-amber-600"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-amber-600 disabled:opacity-50"
        >
          Senden
        </button>
      </form>
    </div>
  );
}
