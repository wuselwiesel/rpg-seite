import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { World } from "@/lib/types";
import { EditWorldForm } from "./edit-world-form";
import { DeleteWorldButton } from "./delete-world-button";

export default async function EditWorldPage({
  params,
}: PageProps<"/worlds/[id]/edit">) {
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

  const { count } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("world_id", id);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Welt bearbeiten</h1>
      <p className="mb-6 text-sm text-muted">
        Titelbild, Name und Beschreibung von {world.name}.
      </p>

      <Link
        href={`/worlds/${world.id}/edit/charaktere`}
        className="mb-6 flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-fg transition hover:border-accent"
      >
        <span className="font-medium">Charaktere</span>
        <span className="flex items-center gap-1 text-sm text-muted">
          {count ?? 0}
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </span>
      </Link>

      <EditWorldForm world={world} />

      <div className="mt-8 border-t border-line pt-6">
        <p className="mb-3 text-sm text-muted">
          Das Löschen entfernt auch alle Charaktere, Beiträge und die Story
          dieser Welt – für alle Mitglieder, unwiderruflich.
        </p>
        <DeleteWorldButton worldId={world.id} worldName={world.name} />
      </div>
    </div>
  );
}
