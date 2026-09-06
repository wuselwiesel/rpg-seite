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
        <h1 className="font-serif text-3xl text-fg">Deine Charaktere</h1>
        <Link
          href="/characters/new"
          className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          + Neuer Charakter
        </Link>
      </div>

      {characters.length === 0 && (
        <p className="text-muted">
          Du hast noch keinen Charakter.{" "}
          <Link href="/characters/new" className="text-accent hover:underline">
            Leg jetzt einen an.
          </Link>
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {characters.map((character) => (
          <li
            key={character.id}
            className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4"
          >
            <Link href={`/characters/${character.id}`} className="flex flex-1 items-center gap-4">
              <CharacterAvatar name={character.name} avatarUrl={character.avatar_url} size={48} />
              <div className="flex-1">
                <p className="font-medium text-fg hover:text-accent">{character.name}</p>
                {character.bio && (
                  <p className="line-clamp-1 text-sm text-muted">{character.bio}</p>
                )}
              </div>
            </Link>
            {character.id === activeId ? (
              <span className="rounded-full bg-accent-strong/15 px-3 py-1 text-xs font-medium text-accent">
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
