import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { World } from "@/lib/types";
import { WorldCharacters, type WorldCharacterRow } from "./world-characters";

type Row = Omit<WorldCharacterRow, "owner_username"> & {
  profiles: { username: string } | null;
};

export default async function WorldCharactersPage({
  params,
}: PageProps<"/worlds/[id]/edit/charaktere">) {
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

  const { data: chars } = await supabase
    .from("characters")
    .select("id, name, avatar_url, is_npc, profiles:owner_id(username)")
    .eq("world_id", id)
    .order("name")
    .returns<Row[]>();
  const characters: WorldCharacterRow[] = (chars ?? []).map(
    ({ profiles, ...c }) => ({
      ...c,
      is_npc: c.is_npc === true,
      owner_username: profiles?.username ?? null,
    }),
  );

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link
        href={`/worlds/${id}/edit`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        {world.name}
      </Link>
      <h1 className="mb-5 font-serif text-3xl text-fg">Charaktere</h1>
      <WorldCharacters characters={characters} />
    </div>
  );
}
