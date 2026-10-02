import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { Check } from "lucide-react";
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

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const characters = await getOwnCharacters(user.id, activeWorld.id);
  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_CHARACTER_COOKIE)?.value ?? characters[0]?.id;

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-fg">Deine Charaktere</h1>
          <p className="truncate text-sm text-muted">in {activeWorld.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/characters/relationships"
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            Beziehungsnetz
          </Link>
          <Link
            href="/characters/new"
            className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
          >
            + Neuer Charakter
          </Link>
        </div>
      </div>

      {characters.length === 0 && (
        <p className="text-muted">
          Du hast noch keinen Charakter in dieser Welt.{" "}
          <Link href="/characters/new" className="text-accent hover:underline">
            Leg jetzt einen an.
          </Link>
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {characters.map((character) => (
          <li
            key={character.id}
            className={`flex items-center gap-4 rounded-2xl border bg-surface p-4 transition ${
              character.id === activeId ? "border-accent/60" : "border-line"
            }`}
          >
            <Link href={`/characters/${character.id}`} className="flex min-w-0 flex-1 items-center gap-4">
              <span className="relative shrink-0">
                <CharacterAvatar name={character.name} avatarUrl={character.avatar_url} size={52} />
                {character.id === activeId && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-accent text-on-accent-strong"
                    aria-hidden
                  >
                    <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-fg hover:text-accent">{character.name}</p>
                {character.bio && (
                  <p className="line-clamp-1 text-sm text-muted">{character.bio}</p>
                )}
              </div>
            </Link>
            {character.id === activeId ? (
              <span className="shrink-0 text-xs font-medium text-accent">Aktiv</span>
            ) : (
              <SetActiveButton characterId={character.id} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
