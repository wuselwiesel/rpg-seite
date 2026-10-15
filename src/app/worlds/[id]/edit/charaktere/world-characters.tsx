import Link from "next/link";
import { CharacterAvatar } from "@/components/character-avatar";

export type WorldCharacterRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  is_npc: boolean;
  owner_username: string | null;
};

function Row({ c, owner }: { c: WorldCharacterRow; owner: boolean }) {
  return (
    <li>
      <Link
        href={`/characters/${c.id}`}
        className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 transition hover:border-accent"
      >
        <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={32} />
        <span className="min-w-0 flex-1 truncate text-sm text-fg">
          {c.name}
        </span>
        {owner && c.owner_username && (
          <span className="shrink-0 text-xs text-muted">
            @{c.owner_username}
          </span>
        )}
      </Link>
    </li>
  );
}

export function WorldCharacters({
  characters,
}: {
  characters: WorldCharacterRow[];
}) {
  const taken = characters.filter((c) => !c.is_npc);
  const free = characters.filter((c) => c.is_npc);
  return (
    <section aria-label="Charaktere">
      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/characters/new"
          className="rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          Neu anlegen
        </Link>
        <Link
          href="/characters/new?npc=1"
          className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent"
        >
          Neuer NPC
        </Link>
      </div>

      <h3 className="mb-2 text-sm font-medium text-fg-soft">
        Vergeben ({taken.length})
      </h3>
      {taken.length === 0 ? (
        <p className="mb-4 text-sm text-muted">Noch keine Charaktere.</p>
      ) : (
        <ul className="mb-5 flex flex-col gap-2">
          {taken.map((c) => (
            <Row key={c.id} c={c} owner />
          ))}
        </ul>
      )}

      <h3 className="mb-2 text-sm font-medium text-fg-soft">
        Frei ({free.length})
      </h3>
      {free.length === 0 ? (
        <p className="text-sm text-muted">Keine freien Figuren.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {free.map((c) => (
            <Row key={c.id} c={c} owner={false} />
          ))}
        </ul>
      )}
    </section>
  );
}
