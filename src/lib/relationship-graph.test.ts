import { describe, expect, it } from "vitest";
import { buildAdjacency, groupHistory, neighborhood, relationshipsAsOf } from "./relationship-graph";
import type { CharacterRelationship, RelationshipHistoryEntry } from "./types";

const rel = (id: string, a: string, b: string): CharacterRelationship => ({
  id,
  world_id: "w",
  character_a_id: a,
  character_b_id: b,
  type: "Befreundet",
  color: "#5b9d6f",
  label: null,
  category: "freundschaft",
  family_role: null,
  created_by: "u",
  created_at: "2026-01-01T00:00:00Z",
});

const hist = (relId: string, at: string, type: string, category: RelationshipHistoryEntry["category"]): RelationshipHistoryEntry => ({
  id: `${relId}-${at}`,
  relationship_id: relId,
  type,
  category,
  color: "#c4553f",
  label: null,
  note: null,
  created_at: at,
});

describe("Beziehungsnetz: Nachbarschaft", () => {
  const rels = [rel("r1", "a", "b"), rel("r2", "b", "c"), rel("r3", "c", "d"), rel("r4", "a", "zzz")];
  const adj = buildAdjacency(rels, new Set(["a", "b", "c", "d"]));

  it("ignoriert Beziehungen zu unbekannten Figuren", () => {
    expect(adj.get("a")).toEqual(new Set(["b"]));
    expect(adj.has("zzz")).toBe(false);
  });

  it("Fokus mit Tiefe 1 und 2", () => {
    expect(neighborhood(adj, "a", 1).sort()).toEqual(["a", "b"]);
    expect(neighborhood(adj, "b", 1).sort()).toEqual(["a", "b", "c"]);
    expect(neighborhood(adj, "a", 2).sort()).toEqual(["a", "b", "c"]);
    expect(neighborhood(adj, "a", 3).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("Figur ohne Beziehung bleibt allein", () => {
    expect(neighborhood(adj, "lonely", 2)).toEqual(["lonely"]);
  });
});

describe("Beziehungsnetz: Stand zu einem Zeitpunkt", () => {
  const rels = [rel("r1", "a", "b"), rel("r2", "a", "c")];
  const history = groupHistory([
    hist("r1", "2026-02-01T00:00:00Z", "Rivalen", "rivalitaet"),
    hist("r1", "2026-05-01T00:00:00Z", "Verbündet", "buendnis"),
    hist("r2", "2026-04-01T00:00:00Z", "Befreundet", "freundschaft"),
  ]);
  const ts = (iso: string) => new Date(iso).getTime();

  it("vor dem ersten Eintrag besteht die Beziehung noch nicht", () => {
    expect(relationshipsAsOf(rels, history, ts("2026-01-15T00:00:00Z"))).toEqual([]);
  });

  it("zeigt den damaligen Stand und lässt später entstandene weg", () => {
    const result = relationshipsAsOf(rels, history, ts("2026-03-01T00:00:00Z"));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "r1", type: "Rivalen", category: "rivalitaet" });
  });

  it("spätere Änderungen lösen frühere ab", () => {
    const result = relationshipsAsOf(rels, history, ts("2026-06-01T00:00:00Z"));
    expect(result.map((r) => r.type).sort()).toEqual(["Befreundet", "Verbündet"]);
  });
});
