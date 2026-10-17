import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { loadCast } from "@/lib/cast-data";
import { CastView } from "./cast-view";

export const metadata = { title: "Besetzung" };

// Rollenliste der Welt (zum Beispiel Figuren einer Serie): wer spielt wen, was ist frei, was ist reserviert
export default async function CastPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const data = await loadCast(supabase, world.id, user.id);
  if (!data.enabled && !data.isAdmin) notFound();

  const { data: folders } = data.isAdmin
    ? await supabase.from("wiki_folders").select("id, name").eq("world_id", world.id).order("name").returns<{ id: string; name: string }[]>()
    : { data: [] as { id: string; name: string }[] };

  return <CastView worldId={world.id} data={data} folders={folders ?? []} />;
}
