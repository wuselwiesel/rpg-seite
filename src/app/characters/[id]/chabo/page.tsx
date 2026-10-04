import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCharacterSheet } from "@/lib/character-sheet-data";
import { Chabo } from "@/components/chabo/chabo";

export const metadata = { title: "Charakterbogen" };

export default async function ChaboPage({ params }: PageProps<"/characters/[id]/chabo">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: character } = await supabase
    .from("characters")
    .select("id, name, owner_id, sheet_url")
    .eq("id", id)
    .maybeSingle<{ id: string; name: string; owner_id: string; sheet_url: string | null }>();
  if (!character) notFound();

  const sheet = await getCharacterSheet(id);
  const isOwn = character.owner_id === user.id;
  if (!isOwn && !sheet) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
      <Link href={`/characters/${id}`} className="flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Zum Profil
      </Link>
      <Chabo key={id} characterId={id} characterName={character.name} initial={sheet} editable={isOwn} legacyUrl={isOwn ? character.sheet_url : null} />
    </div>
  );
}
