import type { AutoBadgeDef, BadgeView } from "@/lib/badges";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { BadgeCard } from "./badge-card";

// Umschalter: standardmäßig nur erreichte Badges, "Alle" zeigt auch die noch nicht erreichten.
export function BadgeFilterTabs({ basePath, showAll, earned, total }: { basePath: string; showAll: boolean; earned: number; total: number }) {
  const tab = (on: boolean) =>
    `rounded-full px-3 py-1 text-sm font-medium transition ${on ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`;
  return (
    <nav className="mb-6 flex gap-2" aria-label="Anzeige">
      <Link href={basePath} replace scroll={false} className={tab(!showAll)}>
        Erreicht ({earned})
      </Link>
      <Link href={`${basePath}?zeige=alle`} replace scroll={false} className={tab(showAll)}>
        Alle ({total})
      </Link>
    </nav>
  );
}

// Automatische Badges nach Kategorie, erreichte zuerst. `metrics` (nur bei eigenen Profilen) liefert Fortschrittsbalken.
export function BadgeSections({
  defs,
  categories,
  earned,
  metrics,
  showAll = true,
}: {
  defs: AutoBadgeDef[];
  categories: readonly string[];
  earned: BadgeView[];
  metrics?: Record<string, number>;
  showAll?: boolean;
}) {
  const got = new Map(earned.map((b) => [b.key, b]));
  if (!showAll && earned.length === 0) {
    return <p className="text-sm text-muted">Noch keine Erfolge erreicht. Mit „Alle“ siehst du, was es zu erreichen gibt.</p>;
  }
  return (
    <div className="flex flex-col gap-8">
      {categories.map((cat) => {
        const list = defs
          .filter((d) => d.category === cat && (showAll || got.has(d.key)))
          .sort((a, b) => Number(got.has(b.key)) - Number(got.has(a.key)) || a.threshold - b.threshold);
        if (!list.length) return null;
        const done = list.filter((d) => got.has(d.key)).length;
        return (
          <section key={cat}>
            <h2 className="mb-3 flex items-baseline gap-2 font-serif text-xl text-fg">
              {cat}
              <span className="font-sans text-xs text-muted">
                {done} von {list.length}
              </span>
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.map((d) => {
                const award = got.get(d.key);
                return (
                  <BadgeCard
                    key={d.key}
                    icon={d.icon}
                    name={d.name}
                    description={d.description}
                    meaning={d.meaning}
                    color={d.color}
                    tier={d.tier}
                    locked={!award}
                    progress={!award && metrics ? { value: Math.min(metrics[d.metric] ?? 0, d.threshold), max: d.threshold } : undefined}
                    footnote={award ? `Erhalten am ${formatDate(award.awardedAt.slice(0, 10))}` : undefined}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// Von Mitgliedern gestaltete bzw. von der Spielleitung verliehene Badges.
export function SpecialBadges({ badges }: { badges: BadgeView[] }) {
  if (!badges.length) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-baseline gap-2 font-serif text-xl text-fg">
        Besondere Badges
        <span className="font-sans text-xs text-muted">{badges.length}</span>
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {badges.map((b) => (
          <BadgeCard
            key={b.awardId}
            icon={b.icon}
            name={b.name}
            description={b.description || "Ein besonderer Titel."}
            color={b.color}
            footnote={`${b.awardedByName ? `Verliehen von ${b.awardedByName} · ` : ""}${formatDate(b.awardedAt.slice(0, 10))}`}
          />
        ))}
      </ul>
    </section>
  );
}

// Das angeklickte Badge zuerst: Beschreibung, Bedeutung und wann es erreicht wurde.
export function FocusedBadge({ badge, defs }: { badge: BadgeView | undefined; defs: AutoBadgeDef[] }) {
  if (!badge) return null;
  const def = defs.find((d) => d.key === badge.key);
  return (
    <section className="mb-8" aria-label="Ausgewähltes Badge">
      <ul>
        <BadgeCard
          icon={badge.icon}
          name={badge.name}
          description={badge.description || "Ein besonderer Titel."}
          meaning={def?.meaning}
          color={badge.color}
          tier={def?.tier}
          footnote={`${badge.awardedByName ? `Verliehen von ${badge.awardedByName} · ` : "Erhalten am "}${formatDate(badge.awardedAt.slice(0, 10))}`}
        />
      </ul>
    </section>
  );
}
