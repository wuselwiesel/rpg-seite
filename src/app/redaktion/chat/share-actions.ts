"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAccountChats } from "@/lib/account-chat";
import { wikiShareText } from "@/lib/wiki-share";
import { sendAccountMessage } from "./actions";

export type ShareChat = { id: string; title: string; kind: "direct" | "group" | "world"; avatarUrl: string | null };

// Die Redaktions-Chats, in die man etwas senden kann (neueste zuerst)
export async function listShareChats(): Promise<ShareChat[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const chats = await getAccountChats(user.id);
  return chats.map((c) => ({ id: c.id, title: c.title, kind: c.kind, avatarUrl: c.avatarUrl }));
}

// Eine Wiki-Seite als Nachricht (Titel und Link) in einen Chat senden; der Server baut den Text selbst.
export async function sendWikiPageToChat(chatId: string, pageId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data: page } = await supabase.from("wiki_pages").select("id, title").eq("id", pageId).maybeSingle<{ id: string; title: string }>();
  if (!page) return "Seite nicht gefunden.";
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "Link konnte nicht gebaut werden.";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return sendAccountMessage(chatId, wikiShareText(page.title, `${proto}://${host}/wiki/${page.id}`));
}
