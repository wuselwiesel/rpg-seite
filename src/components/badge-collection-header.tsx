import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";

export function BadgeCollectionHeader({
  name,
  avatarUrl,
  profileHref,
  profileLabel,
  title,
  done,
  total,
  extra,
}: {
  name: string;
  avatarUrl: string | null;
  profileHref: string;
  profileLabel: string;
  title: string;
  done: number;
  total: number;
  extra?: number;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <header className="mb-8">
      <Link href={profileHref} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        {profileLabel}
      </Link>
      <div className="flex items-center gap-4">
        <CharacterAvatar name={name} avatarUrl={avatarUrl} size={64} />
        <div className="min-w-0">
          <h1 className="font-serif text-2xl text-fg sm:text-3xl">{title}</h1>
          <p className="truncate text-sm text-muted">{name}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            {done} von {total} Erfolgen{extra ? ` · ${extra} ${extra === 1 ? "besonderes Badge" : "besondere Badges"}` : ""}
          </span>
          <Link href="/badges" className="underline decoration-dotted hover:text-fg">
            Alle Badges ansehen
          </Link>
        </p>
      </div>
    </header>
  );
}
