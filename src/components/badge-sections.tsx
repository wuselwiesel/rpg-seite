import type { AutoBadgeDef, BadgeView } from "@/lib/badges";
import { formatDate } from "@/lib/format";
import { BadgeCard } from "./badge-card";

// Automatische Badges nach Kategorie, erreichte zuerst. `metrics` (nur bei eigenen Profilen) liefert Fortschrittsbalken.
export function BadgeSections({
  defs,
  categories,
  earned,
  metrics,
}: {
  defs: AutoBadgeDef[];
  categories: readonly string[];
  earned: BadgeView[];
  metrics?: Record<string, number>;
}) {
  const got = new Map(earned.map((b) => [b.key, b]));
  return (
    <div className="flex flex-col gap-8">
      {categories.map((cat) => {
        const list = defs
          .filter((d) => d.category === cat)
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
            description={b.description || "Ein besonderer Titel aus dieser Welt."}
            color={b.color}
            footnote={`${b.awardedByName ? `Verliehen von ${b.awardedByName} · ` : ""}${formatDate(b.awardedAt.slice(0, 10))}`}
          />
        ))}
      </ul>
    </section>
  );
}
