import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";

// „Nachricht“ auf einem Profil: direkt in den Zweier-Chat mit dieser Person. Den bestehenden Chat öffnen, sonst einen anlegen.
export default async function DirectChatPage({ params }: PageProps<"/chats/mit/[id]">) {
  const { id: otherId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");
  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) redirect("/characters/new");
  if (otherId === activeCharacter.id) redirect("/chats");

  const { data: other } = await supabase
    .from("characters")
    .select("id")
    .eq("id", otherId)
    .eq("world_id", activeWorld.id)
    .eq("is_npc", false)
    .is("deleted_at", null)
    .maybeSingle();
  if (!other) redirect("/chats/new");

  // Bestehenden Zweier-Chat suchen: nicht-Gruppe, in dem beide sind
  const { data: mine } = await supabase
    .from("chat_participants")
    .select("chat_id, chats!inner(is_group)")
    .eq("character_id", activeCharacter.id)
    .eq("chats.is_group", false);
  const myChatIds = (mine ?? []).map((r) => r.chat_id as string);
  if (myChatIds.length > 0) {
    const { data: shared } = await supabase
      .from("chat_participants")
      .select("chat_id")
      .eq("character_id", otherId)
      .in("chat_id", myChatIds)
      .limit(1);
    if (shared?.[0]) redirect(`/chats/${shared[0].chat_id}`);
  }

  const { data: chat } = await supabase.from("chats").insert({ name: null, is_group: false, created_by: user.id }).select("id").single();
  if (!chat) redirect("/chats/new");
  const { error } = await supabase.from("chat_participants").insert([
    { chat_id: chat.id, character_id: activeCharacter.id },
    { chat_id: chat.id, character_id: otherId },
  ]);
  if (error) redirect("/chats/new");
  redirect(`/chats/${chat.id}`);
}
