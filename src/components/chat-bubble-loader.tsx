import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { getUnreadCounts } from "@/lib/chat-reads";
import { getAccountUnread } from "@/lib/account-chat";
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
  const [rpUnread, accountUnread] = await Promise.all([
    myCharacterIds.length ? getUnreadCounts(user.id, myCharacterIds, active?.id) : Promise.resolve({}),
    getAccountUnread(user.id),
  ]);

  return (
    <ChatBubble
      userId={user.id}
      myCharacterIds={myCharacterIds}
      initialRpUnread={rpUnread}
      initialAccountUnread={accountUnread}
    />
  );
}
