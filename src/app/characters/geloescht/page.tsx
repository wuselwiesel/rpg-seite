import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CharacterAvatar } from "@/components/character-avatar";
import { NpcBadge } from "@/components/npc-badge";
import { DeletedCharacterActions } from "./deleted-character-actions";

type Row = {
  id: string;
  name: string;
  avatar_url: string | null;
  is_npc: boolean | null;
  owner_id: string;
  deleted_at: string;
  worlds: { name: string; created_by: string } | null;
};

// Gelöschte Charaktere: ausgeblendet, aber mit allen Inhalten erhalten. Hier lassen sie sich zurückholen oder endgültig löschen.
export default async function DeletedCharactersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("characters")
    .select("id, name, avatar_url, is_npc, owner_id, deleted_at, worlds(name, created_by)")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .returns<Row[]>();
  // Eigene Charaktere, dazu gelöschte NPCs aus Welten, die einem gehören
  const rows = (data ?? []).filter((c) => c.owner_id === user.id || (c.is_npc && c.worlds?.created_by === user.id));

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-1">
        <Link
          href="/characters"
          aria-label="Zurück zu den Charakteren"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-fg transition hover:bg-surface-2"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2} />
        </Link>
        <h1 className="font-serif text-3xl text-fg">Gelöschte Charaktere</h1>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Keine gelöschten Charaktere.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <Link href={`/characters/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={44} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">
                    {c.name}
                    {c.is_npc && <NpcBadge className="ml-2" />}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {c.worlds?.name ?? "Welt"} · gelöscht am {new Date(c.deleted_at).toLocaleDateString("de-DE")}
                  </span>
                </span>
              </Link>
              <DeletedCharacterActions characterId={c.id} name={c.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
