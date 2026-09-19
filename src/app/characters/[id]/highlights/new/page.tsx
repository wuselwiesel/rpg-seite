import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewHighlightForm } from "./new-highlight-form";
import type { Character, Story } from "@/lib/types";

export default async function NewHighlightPage({ params }: PageProps<"/characters/[id]/highlights/new">) {
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
    .eq("owner_id", user.id)
    .maybeSingle<Character>();
  if (!character) notFound();

  const { data: stories } = await supabase
    .from("stories")
    .select("*")
    .eq("character_id", id)
    .order("created_at", { ascending: false })
    .returns<Story[]>();

  return (
    <div className="mx-auto max-w-lg px-4 py-4 sm:py-10">
      <div className="mb-4 flex items-center gap-1">
        <Link
          href={`/characters/${id}`}
          aria-label="Zurück zum Profil"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-fg transition hover:bg-surface-2"
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={2} />
        </Link>
        <h1 className="font-serif text-3xl text-fg">Neues Highlight</h1>
      </div>
      <NewHighlightForm characterId={id} stories={stories ?? []} />
    </div>
  );
}
