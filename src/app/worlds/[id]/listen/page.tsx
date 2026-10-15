import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { ListsEditor } from "./lists-editor";
import { WorldAdminTabs } from "@/components/world-admin-tabs";

export const metadata = { title: "Auswahllisten" };

export default async function WorldListsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: world } = await supabase.from("worlds").select("id, name, created_by").eq("id", id).maybeSingle<{ id: string; name: string; created_by: string }>();
  if (!world) notFound();
  const { data: admin } = await supabase.rpc("is_world_admin", { _world_id: id });
  if (!admin) redirect(`/worlds/${id}`);

  const lists = await getWorldChoiceLists(id, true);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-4 font-serif text-3xl text-fg">{world.name}</h1>
      <WorldAdminTabs worldId={id} />
      <ListsEditor worldId={id} lists={lists} />
    </div>
  );
}
