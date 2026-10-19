import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWorldFirstNames } from "@/lib/npc-data";
import { fetchRandomLists } from "@/lib/random-lists";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
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
  const choiceLists = world ? await getWorldChoiceLists(world.id, true) : [];
  const fateEnabled = world ? world.fate_enabled !== false : true;
  const houseEnabled = world ? world.house_enabled !== false : true;
  const npc = Array.isArray(sp.npc) ? sp.npc[0] : sp.npc;
  // Zugesagte Rolle aus der Besetzung: Name vorausgefüllt, der Charakter wird danach mit der Rolle verbunden
  const roleId = Array.isArray(sp.rolle) ? sp.rolle[0] : sp.rolle;
  let role: { id: string; name: string } | null = null;
  if (roleId && world) {
    const { data } = await supabase
      .from("world_roles")
      .select("id, name, holder_user, holder_kind, world_id")
      .eq("id", roleId)
      .maybeSingle<{ id: string; name: string; holder_user: string | null; holder_kind: string | null; world_id: string }>();
    if (data && data.world_id === world.id && data.holder_kind === "approved" && data.holder_user === user.id) role = { id: data.id, name: data.name };
  }
  return <NewCharacterForm takenNames={takenNames} randomLists={randomLists} startAsNpc={npc === "1"} choiceLists={choiceLists} fateEnabled={fateEnabled} houseEnabled={houseEnabled} role={role} />;
}
