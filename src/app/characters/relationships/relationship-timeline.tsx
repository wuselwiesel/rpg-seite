import { formatDate } from "@/lib/format";
import { categoryInfo } from "@/lib/relationships";
import type { Character, CharacterRelationship, RelationshipHistoryEntry } from "@/lib/types";

// Verlauf: pro Beziehung die Entwicklung als Kette ("Rivalen -> Verbündet") mit Datum und Notiz.
export function RelationshipTimeline({
  relationships,
  history,
  characters,
}: {
  relationships: CharacterRelationship[];
  history: RelationshipHistoryEntry[];
  characters: Character[];
}) {
  const names = new Map(characters.map((c) => [c.id, c.name]));
  const byRelationship = new Map<string, RelationshipHistoryEntry[]>();
  for (const h of history) byRelationship.set(h.relationship_id, [...(byRelationship.get(h.relationship_id) ?? []), h]);

  const rows = relationships
    .map((rel) => ({ rel, steps: (byRelationship.get(rel.id) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)) }))
    .sort((a, b) => b.steps.length - a.steps.length || a.rel.created_at.localeCompare(b.rel.created_at));

  if (rows.length === 0) return <p className="text-sm text-muted">Keine Beziehungen in dieser Ansicht.</p>;

  return (
    <ol className="flex flex-col gap-4">
      {rows.map(({ rel, steps }) => (
        <li key={rel.id} className="rounded-xl bg-surface-2 p-4">
          <p className="mb-3 text-sm font-medium text-fg">
            {names.get(rel.character_a_id) ?? "?"} & {names.get(rel.character_b_id) ?? "?"}
            <span className="ml-2 text-xs font-normal text-muted">{categoryInfo(rel.category).label}</span>
          </p>
          <div className="relative flex flex-col gap-3 border-l-2 border-line pl-4">
            {steps.map((step, i) => (
              <div key={step.id} className="relative">
                <span
                  className="absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full border-2 border-surface-2"
                  style={{ backgroundColor: step.color }}
                />
                <p className="text-sm text-fg">
                  {i > 0 && <span className="text-muted">{steps[i - 1].type} → </span>}
                  <span className="font-medium" style={{ color: step.color }}>
                    {step.type}
                  </span>
                  {step.label && <span className="text-fg-soft"> – {step.label}</span>}
                </p>
                <p className="text-xs text-muted">
                  {i === 0 ? "Angelegt" : "Geändert"} am {formatDate(step.created_at.slice(0, 10))}
                  {step.note && <span className="text-fg-soft"> · {step.note}</span>}
                </p>
              </div>
            ))}
            {steps.length <= 1 && (
              <p className="text-xs text-muted">Noch keine Entwicklung. Mit dem Stift-Symbol bei „Alle Beziehungen“ kannst du sie weiterentwickeln.</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
