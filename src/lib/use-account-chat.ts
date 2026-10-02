"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteAccountMessage, sendAccountMessage, updateAccountMessage } from "@/app/redaktion/chat/actions";

export type AccountMessage = { id: string; sender_id: string; content: string; created_at: string; updated_at?: string | null; pending?: boolean };

// Live-Nachrichten eines Redaktions-Chats (Realtime + optimistisches Senden); wird vom Chatfenster und von der Chat-Blase genutzt.
export function useAccountChat(
  chatId: string,
  userId: string,
  initialMessages: AccountMessage[],
  initialPartnerRead: string | null,
  onIncoming?: (message: AccountMessage) => void,
) {
  const [messages, setMessages] = useState(initialMessages);
  const [partnerRead, setPartnerRead] = useState(initialPartnerRead);
  const [error, setError] = useState<string | null>(null);
  const onIncomingRef = useRef(onIncoming);
  useEffect(() => {
    onIncomingRef.current = onIncoming;
  });

  const markRead = useCallback(() => {
    createClient()
      .from("account_chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .then();
  }, [chatId, userId]);

  useEffect(() => {
    markRead();
    const supabase = createClient();
    const channel = supabase
      .channel(`account-chat-${chatId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "account_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const row = payload.new as AccountMessage;
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === row.id);
            if (exists) return prev.map((m) => (m.id === row.id ? { ...row } : m));
            return [...prev, row];
          });
          if (row.sender_id !== userId) {
            onIncomingRef.current?.(row);
            if (document.visibilityState === "visible") markRead();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "account_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const row = payload.new as AccountMessage;
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "account_messages" },
        (payload) => {
          const row = payload.old as { id?: string };
          if (row.id) setMessages((prev) => prev.filter((m) => m.id !== row.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "account_chat_participants", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const row = payload.new as { user_id: string; last_read_at: string };
          if (row.user_id !== userId) setPartnerRead(row.last_read_at);
        },
      )
      .subscribe();
    const onVisible = () => document.visibilityState === "visible" && markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [chatId, userId, markRead]);

  async function send(content: string) {
    const text = content.trim();
    if (!text) return;
    const id = crypto.randomUUID();
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id, sender_id: userId, content: text, created_at: new Date().toISOString(), pending: true },
    ]);
    const err = await sendAccountMessage(chatId, text, id);
    if (err) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setError(err);
    } else {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pending: false } : m)));
    }
  }

  async function remove(messageId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    const err = await deleteAccountMessage(messageId);
    if (err) setError(err);
  }

  async function edit(messageId: string, content: string) {
    const text = content.trim();
    if (!text) return;
    const before = messages.find((m) => m.id === messageId);
    if (!before || before.content === text) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: text, updated_at: new Date().toISOString() } : m)),
    );
    const err = await updateAccountMessage(messageId, text);
    if (err) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...before } : m)));
      setError(err);
    }
  }

  return { messages, partnerRead, error, send, edit, remove, markRead };
}
