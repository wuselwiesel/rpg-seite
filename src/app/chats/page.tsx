import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { ChatList } from "./chat-list";
import { ChatsEmptyPane } from "./empty-pane";

export default async function ChatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) redirect("/characters/new");

  return (
    <>
      <div className="mx-auto max-w-2xl px-1 py-6 lg:hidden">
        <ChatList />
      </div>
      <ChatsEmptyPane />
    </>
  );
}
