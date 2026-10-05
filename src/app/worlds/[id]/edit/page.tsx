import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { World } from "@/lib/types";
import { EditWorldForm } from "./edit-world-form";
import { DeleteWorldButton } from "./delete-world-button";

export default async function EditWorldPage({ params }: PageProps<"/worlds/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: world } = await supabase
    .from("worlds")
    .select("*")
    .eq("id", id)
    .maybeSingle<World>();

  if (!world) notFound();
  const isOwner = world.created_by === user.id;
  if (!isOwner) {
    const { data: me } = await supabase.from("world_members").select("role").eq("world_id", id).eq("user_id", user.id).maybeSingle();
    if (me?.role !== "admin") redirect(`/worlds/${id}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Welt bearbeiten</h1>
      <p className="mb-6 text-sm text-muted">
        Titelbild, Name und Beschreibung von {world.name}.
      </p>

      <EditWorldForm world={world} />

      {isOwner && (
        <div className="mt-8 border-t border-line pt-6">
          <p className="mb-3 text-sm text-muted">
            Das Löschen entfernt auch alle Charaktere, Beiträge und die Story dieser Welt – für alle
            Mitglieder, unwiderruflich.
          </p>
          <DeleteWorldButton worldId={world.id} worldName={world.name} />
        </div>
      )}
    </div>
  );
}
