import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
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

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) redirect("/characters/new");

  const { data: chat } = await supabase
    .from("chats")
    .select("*, chat_participants(characters(*))")
    .eq("id", id)
    .maybeSingle<ChatWithParticipants>();

  if (!chat) notFound();

  const [{ data: messages }, { data: myCharacters }] = await Promise.all([
    supabase
      .from("messages")
      .select("*, characters(*), reactions(emoji, character_id)")
      .eq("chat_id", id)
      .order("created_at", { ascending: true })
      .returns<Message[]>(),
    supabase.from("characters").select("id").eq("owner_id", user.id),
  ]);
  const myCharacterIds = (myCharacters ?? []).map((c) => c.id);

  const participants = chat.chat_participants.map((p) => p.characters);
  const title = chat.is_group
    ? chat.name
    : (participants.find((p) => p.id !== activeCharacter.id)?.name ?? chat.name ?? "Chat");

  const { data: worldCharacters } = await supabase
    .from("characters")
    .select("*")
    .eq("world_id", activeWorld.id)
    .order("name")
    .returns<Character[]>();

  const participantIds = new Set(participants.map((p) => p.id));
  const availableCharacters = (worldCharacters ?? []).filter((c) => !participantIds.has(c.id));

  return (
    <ChatRoom
      chatId={chat.id}
      userId={user.id}
      title={title ?? "Chat"}
      participants={participants}
      availableCharacters={availableCharacters}
      initialMessages={messages ?? []}
      activeCharacter={activeCharacter}
      myCharacterIds={myCharacterIds}
    />
  );
}
