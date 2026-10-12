import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { ListsEditor } from "./lists-editor";

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

  const lists = await getWorldChoiceLists(id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/worlds/${id}`} className="mb-4 flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        {world.name}
      </Link>
      <h1 className="mb-6 font-serif text-3xl text-fg">Auswahllisten</h1>
      <ListsEditor worldId={id} lists={lists} />
    </div>
  );
}
