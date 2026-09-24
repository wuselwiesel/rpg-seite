import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMentionableCharacters, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { SchicksalForm } from "./schicksal-form";

export default async function SchicksalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const [ownCharacters, mentionable] = await Promise.all([
    getOwnCharacters(user.id, activeWorld.id),
    getMentionableCharacters(user.id, activeWorld.id),
  ]);
  if (ownCharacters.length === 0) redirect("/characters/new");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Schicksalswürfel</h1>
      <p className="mb-6 text-sm text-muted">
        Würfle ein einschneidendes Schicksal für einen deiner Charaktere und poste es als neue Szene in der Story.
      </p>
      <SchicksalForm ownCharacters={ownCharacters} mentionable={mentionable} />
    </div>
  );
}
