import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWorldFirstNames } from "@/lib/npc-data";
import { fetchRandomLists } from "@/lib/random-lists";
import { NewCharacterForm } from "./new-character-form";

export default async function NewCharacterPage({ searchParams }: PageProps<"/characters/new">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  const takenNames = world ? await getWorldFirstNames(world.id) : [];
  const randomLists = world ? await fetchRandomLists(supabase, world.id) : undefined;
  const npc = Array.isArray(sp.npc) ? sp.npc[0] : sp.npc;
  return <NewCharacterForm takenNames={takenNames} randomLists={randomLists} startAsNpc={npc === "1"} />;
}
