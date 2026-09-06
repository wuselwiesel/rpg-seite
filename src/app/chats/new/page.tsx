import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { NewChatForm } from "./new-chat-form";
import type { Character } from "@/lib/types";

export default async function NewChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeCharacter = await getActiveCharacter(user.id);
  if (!activeCharacter) redirect("/characters/new");

  const { data: characters } = await supabase
    .from("characters")
    .select("*")
    .order("name")
    .returns<Character[]>();

  const otherCharacters = (characters ?? []).filter((c) => c.id !== activeCharacter?.id);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Neuer Chat</h1>
      <p className="mb-6 text-sm text-muted">
        Du nimmst als <span className="text-accent">{activeCharacter?.name}</span> teil.
      </p>

      <NewChatForm characters={otherCharacters} />
    </div>
  );
}
