"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadChatImage } from "@/lib/chat-image";
import { deleteAccountMessage, sendAccountMessage, updateAccountMessage } from "@/app/redaktion/chat/actions";

export type AccountMessage = { id: string; sender_id: string; content: string; image_url?: string | null; created_at: string; updated_at?: string | null; pending?: boolean };

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

  // Mit `image` wird das Bild zuerst hochgeladen; bis dahin zeigt die Nachricht die lokale Vorschau.
  async function send(content: string, image?: { file: File; previewUrl: string } | null): Promise<boolean> {
    const text = content.trim();
    if (!text && !image) return false;
    const id = crypto.randomUUID();
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id, sender_id: userId, content: text, image_url: image?.previewUrl ?? null, created_at: new Date().toISOString(), pending: true },
    ]);
    const fail = (message: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setError(message);
      return false;
    };
    let imageUrl: string | null = null;
    if (image) {
      const uploaded = await uploadChatImage(`account/${chatId}`, image.file);
      if ("error" in uploaded) return fail(uploaded.error);
      imageUrl = uploaded.url;
    }
    const err = await sendAccountMessage(chatId, text, id, imageUrl);
    if (err) return fail(err);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pending: false, image_url: imageUrl ?? m.image_url } : m)));
    if (image) URL.revokeObjectURL(image.previewUrl);
    return true;
  }

  async function remove(messageId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    const err = await deleteAccountMessage(messageId);
    if (err) setError(err);
  }

  async function edit(messageId: string, content: string) {
    const text = content.trim();
    const before = messages.find((m) => m.id === messageId);
    if (!before || before.content === text || (!text && !before.image_url)) return;
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
