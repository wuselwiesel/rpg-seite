import type { CharacterRelationship, RelationshipHistoryEntry } from "@/lib/types";

type Edge = Pick<CharacterRelationship, "character_a_id" | "character_b_id">;

// Nachbarschaft: für jede Figur die Menge der direkt verbundenen (nur Figuren aus `known`).
export function buildAdjacency(relationships: Edge[], known: Set<string>): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const add = (from: string, to: string) => {
    const set = adj.get(from) ?? new Set<string>();
    set.add(to);
    adj.set(from, set);
  };
  for (const r of relationships) {
    if (!known.has(r.character_a_id) || !known.has(r.character_b_id)) continue;
    add(r.character_a_id, r.character_b_id);
    add(r.character_b_id, r.character_a_id);
  }
  return adj;
}

// Fokus plus alle Figuren bis `depth` Schritte entfernt (1 = direkte Beziehungen, 2 = + Bekannte).
export function neighborhood(adj: Map<string, Set<string>>, focus: string, depth: number): string[] {
  const seen = new Set([focus]);
  let frontier = [focus];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of adj.get(id) ?? []) {
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return Array.from(seen);
}

export type HistoryByRelationship = Map<string, { at: number; h: RelationshipHistoryEntry }[]>;

export function groupHistory(history: RelationshipHistoryEntry[]): HistoryByRelationship {
  const m: HistoryByRelationship = new Map();
  for (const h of history) {
    const list = m.get(h.relationship_id) ?? [];
    list.push({ at: new Date(h.created_at).getTime(), h });
    m.set(h.relationship_id, list);
  }
  for (const list of m.values()) list.sort((a, b) => a.at - b.at);
  return m;
}

// Beziehungen, wie sie zum Zeitpunkt `asOf` waren: noch nicht bestehende fallen weg, die übrigen zeigen
// Art, Farbe und Kategorie ihres damaligen Stands (letzter Verlaufseintrag bis dahin).
export function relationshipsAsOf(
  relationships: CharacterRelationship[],
  historyByRel: HistoryByRelationship,
  asOf: number,
): CharacterRelationship[] {
  return relationships.flatMap((rel) => {
    const steps = historyByRel.get(rel.id);
    if (!steps) return [];
    let state: RelationshipHistoryEntry | null = null;
    for (const step of steps) {
      if (step.at <= asOf) state = step.h;
      else break;
    }
    return state ? [{ ...rel, type: state.type, color: state.color, category: state.category, label: state.label }] : [];
  });
}
