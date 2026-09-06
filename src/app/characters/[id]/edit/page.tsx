import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Character } from "@/lib/types";
import { EditCharacterForm } from "./edit-character-form";

export default async function EditCharacterPage({
  params,
}: PageProps<"/characters/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: character } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .maybeSingle<Character>();

  if (!character) notFound();
  if (character.owner_id !== user.id) redirect(`/characters/${id}`);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 font-serif text-3xl text-stone-100">Charakter bearbeiten</h1>
      <EditCharacterForm character={character} />
    </div>
  );
}
