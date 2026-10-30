import { redirect } from "next/navigation";
import { NoCharacterBanner } from "@/components/no-character-banner";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { ChatList } from "./chat-list";
import { ChatsEmptyPane } from "./empty-pane";

export const metadata = { title: "Chats" };

export default async function ChatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="mb-3 font-serif text-3xl text-fg">Chats</h1>
        <NoCharacterBanner worldId={activeWorld.id} />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-1 py-6 lg:hidden">
        <ChatList />
      </div>
      <ChatsEmptyPane />
    </>
  );
}
