import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import type { Character, Chat, Message } from "@/lib/types";
import { ChatRoom } from "./chat-room";

type ChatWithParticipants = Chat & {
  chat_participants: { characters: Character }[];
};

export default async function ChatDetailPage({ params }: PageProps<"/chats/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeCharacter = await getActiveCharacter(user.id);
  if (!activeCharacter) redirect("/characters/new");

  const { data: chat } = await supabase
    .from("chats")
    .select("*, chat_participants(characters(*))")
    .eq("id", id)
    .maybeSingle<ChatWithParticipants>();

  if (!chat) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*, characters(*)")
    .eq("chat_id", id)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  const participants = chat.chat_participants.map((p) => p.characters);
  const title = chat.is_group
    ? chat.name
    : (participants.find((p) => p.id !== activeCharacter.id)?.name ?? chat.name ?? "Chat");

  return (
    <ChatRoom
      chatId={chat.id}
      userId={user.id}
      title={title ?? "Chat"}
      participants={participants}
      initialMessages={messages ?? []}
      activeCharacter={activeCharacter}
    />
  );
}
