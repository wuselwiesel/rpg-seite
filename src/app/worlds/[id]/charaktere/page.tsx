import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { loadWorldRoster } from "@/lib/world-roster-data";
import { WorldRoster } from "@/app/story/charaktere/world-roster";
import type { World } from "@/lib/types";

export const metadata = { title: "Charaktere der Welt" };

// Nur die Charaktere dieser Welt: frei, vergeben, NPCs; mit Knopf zum Anlegen
export default async function WorldCharactersOnlyPage({ params }: PageProps<"/worlds/[id]/charaktere">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: world } = await supabase.from("worlds").select("*").eq("id", id).maybeSingle<World>();
  if (!world) notFound();
  const { data: me } = await supabase.from("world_members").select("role").eq("world_id", id).eq("user_id", user.id).maybeSingle();
  if (!me) redirect(`/worlds/${id}`);

  const [{ characters, members, offerTargets, isAdmin }, active] = await Promise.all([loadWorldRoster(supabase, id, user.id), getActiveWorld(user.id)]);
  // Neue Charaktere entstehen in der aktiven Welt
  const canCreate = active?.id === id;

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-6 sm:py-10">
      <Link href={`/worlds/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        {world.name}
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-fg">Charaktere</h1>
        {canCreate && (
          <Link href="/characters/new" className="inline-flex items-center gap-1.5 rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Neu anlegen
          </Link>
        )}
      </div>
      <WorldRoster characters={characters} members={members} offerTargets={offerTargets} isAdmin={isAdmin} />
    </div>
  );
}
