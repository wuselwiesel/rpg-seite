import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { NewChatForm } from "./new-chat-form";
import type { Character } from "@/lib/types";

export default async function NewChatPage({ searchParams }: PageProps<"/chats/new">) {
  const params = await searchParams;
  const withId = typeof params.with === "string" ? params.with : "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) redirect("/characters/new");

  const { data: characters } = await supabase
    .from("characters")
    .select("*")
    .eq("world_id", activeWorld.id)
    .eq("is_npc", false)
    .is("deleted_at", null)
    .order("name")
    .returns<Character[]>();

  const otherCharacters = (characters ?? []).filter((c) => c.id !== activeCharacter?.id);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Neuer Chat</h1>
      <p className="mb-6 text-sm text-muted">
        Du nimmst als <span className="text-accent">{activeCharacter?.name}</span> teil.
      </p>

      <NewChatForm characters={otherCharacters} initialSelected={otherCharacters.some((c) => c.id === withId) ? [withId] : []} />
    </div>
  );
}
