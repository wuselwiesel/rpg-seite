import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { World } from "@/lib/types";
import { EditWorldForm } from "./edit-world-form";

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
  if (world.created_by !== user.id) redirect(`/worlds/${id}`);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Welt bearbeiten</h1>
      <p className="mb-6 text-sm text-muted">
        Titelbild, Name und Beschreibung von {world.name}.
      </p>

      <EditWorldForm world={world} />
    </div>
  );
}
