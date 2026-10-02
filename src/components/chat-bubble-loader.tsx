import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { getUnreadCounts } from "@/lib/chat-reads";
import { getAccountChats } from "@/lib/account-chat";
import { ChatBubble } from "./chat-bubble";

// Lädt nur die ungelesenen Zähler für den Start; die Chatliste holt die Blase erst beim Öffnen.
export async function ChatBubbleLoader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const world = await getActiveWorld(user.id);
  const characters = world ? await getOwnCharacters(user.id, world.id) : [];
  const myCharacterIds = characters.map((c) => c.id);
  const active = world ? await getActiveCharacter(user.id, world.id) : null;
  const [rpUnread, accountChats] = await Promise.all([
    myCharacterIds.length ? getUnreadCounts(user.id, myCharacterIds, active?.id) : Promise.resolve({}),
    getAccountChats(user.id),
  ]);
  const accountUnread: Record<string, number> = {};
  for (const c of accountChats) if (c.unread > 0 && !c.muted) accountUnread[c.id] = c.unread;

  return (
    <ChatBubble
      userId={user.id}
      myCharacterIds={myCharacterIds}
      initialRpUnread={rpUnread}
      initialAccountUnread={accountUnread}
    />
  );
}
