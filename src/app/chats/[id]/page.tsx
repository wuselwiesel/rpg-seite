import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import type { Character, Chat, Message } from "@/lib/types";
import { ChatRoom } from "./chat-room";

type ChatWithParticipants = Chat & {
  chat_participants: { muted: boolean; characters: Character }[];
};

export default async function ChatDetailPage({ params, searchParams }: PageProps<"/chats/[id]">) {
  const { id } = await params;
  const { as: asCharacterId } = await searchParams;
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
    .select("*, chat_participants(muted, characters(*))")
    .eq("id", id)
    .maybeSingle<ChatWithParticipants>();

  if (!chat) notFound();

  // Gehört der Chat einem anderen eigenen Charakter (z.B. über eine Benachrichtigung),
  // wechseln wir automatisch zu dem angeschriebenen Charakter statt eine 404 zu zeigen.
  if (!chat.chat_participants.some((p) => p.characters.id === activeCharacter.id)) {
    const ownParticipants = chat.chat_participants.filter((p) => p.characters.owner_id === user.id);
    const wanted =
      ownParticipants.find((p) => p.characters.id === asCharacterId) ?? ownParticipants[0] ?? null;
    if (!wanted) notFound();
    redirect(`/switch-character?character=${wanted.characters.id}&next=${encodeURIComponent(`/chats/${id}`)}`);
  }
  if (typeof asCharacterId === "string" && asCharacterId !== activeCharacter.id) {
    const wanted = chat.chat_participants.find(
      (p) => p.characters.id === asCharacterId && p.characters.owner_id === user.id,
    );
    if (wanted) {
      redirect(`/switch-character?character=${wanted.characters.id}&next=${encodeURIComponent(`/chats/${id}`)}`);
    }
  }

  const [{ data: messages }, { data: myCharacters }, { data: reads }] = await Promise.all([
    supabase
      .from("messages")
      .select(
        "*, characters(*), reactions(emoji, character_id), shared_post:shared_post_id(id, content, media_url, media_type, media_urls, characters!posts_character_id_fkey(name, username, avatar_url)), story:story_id(id, image_url, video_url, bg, text_content, expires_at)",
      )
      .eq("chat_id", id)
      .order("created_at", { ascending: true })
      .returns<Message[]>(),
    supabase.from("characters").select("id").eq("owner_id", user.id),
    supabase.from("chat_reads").select("user_id, last_read_at").eq("chat_id", id).neq("user_id", user.id),
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
      isGroup={chat.is_group}
      avatarUrl={chat.avatar_url ?? null}
      canDelete={!chat.is_group || chat.created_by === user.id}
      participants={participants}
      availableCharacters={availableCharacters}
      initialMessages={messages ?? []}
      activeCharacter={activeCharacter}
      myCharacterIds={myCharacterIds}
      initialReads={reads ?? []}
      initialMuted={chat.chat_participants.some((p) => p.characters.owner_id === user.id && p.muted)}
    />
  );
}
