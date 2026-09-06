import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnCharacters } from "@/lib/active-character";
import { SetActiveButton } from "./set-active-button";
import { CharacterAvatar } from "@/components/character-avatar";
import { ACTIVE_CHARACTER_COOKIE } from "@/lib/types";
import { cookies } from "next/headers";

export default async function CharactersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const characters = await getOwnCharacters(user.id);
  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_CHARACTER_COOKIE)?.value ?? characters[0]?.id;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-stone-100">Deine Charaktere</h1>
        <Link
          href="/characters/new"
          className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-amber-600"
        >
          + Neuer Charakter
        </Link>
      </div>

      {characters.length === 0 && (
        <p className="text-stone-400">
          Du hast noch keinen Charakter.{" "}
          <Link href="/characters/new" className="text-amber-500 hover:underline">
            Leg jetzt einen an.
          </Link>
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {characters.map((character) => (
          <li
            key={character.id}
            className="flex items-center gap-4 rounded-lg border border-stone-800 bg-stone-900/60 p-4"
          >
            <Link href={`/characters/${character.id}`} className="flex flex-1 items-center gap-4">
              <CharacterAvatar name={character.name} avatarUrl={character.avatar_url} size={48} />
              <div className="flex-1">
                <p className="font-medium text-stone-100 hover:text-amber-400">{character.name}</p>
                {character.bio && (
                  <p className="line-clamp-1 text-sm text-stone-400">{character.bio}</p>
                )}
              </div>
            </Link>
            {character.id === activeId ? (
              <span className="rounded-full bg-amber-900/60 px-3 py-1 text-xs font-medium text-amber-300">
                Aktiv
              </span>
            ) : (
              <SetActiveButton characterId={character.id} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
