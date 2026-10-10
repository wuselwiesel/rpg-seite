import type { SupabaseClient } from "@supabase/supabase-js";
import { splitMentions, type MentionTarget } from "@/lib/sheet-mentions";
import { guessRelation } from "@/lib/relationships";
import type { SheetItem } from "@/lib/sheet-rules";

// Steht in einer ChaBo-Zeile genau eine andere Figur („@Name“), liefert das ihre ID; sonst null.
export function singleMentionId(value: string, chars: MentionTarget[], selfId: string): string | null {
  const ids = new Set<string>();
  for (const part of splitMentions(value, chars)) if (part.kind === "mention" && part.target.id !== selfId) ids.add(part.target.id);
  return ids.size === 1 ? [...ids][0] : null;
}

// Bezeichnung, die eine Beziehung aus Sicht einer Figur im ChaBo trägt (dieselbe Regel wie in sync_relationship_sheets)
export function canonicalLabel(edge: { type: string; family_role: string | null }, selfIsA: boolean): string {
  if (edge.family_role === "eltern") return selfIsA ? "Kind" : "Elternteil";
  return edge.type.slice(0, 40);
}

type Edge = { id: string; world_id: string; character_a_id: string; character_b_id: string; type: string; family_role: string | null };
const norm = (s: string) => s.trim().toLowerCase();

// Gleicht die Zeilen des Abschnitts „Familie/Beziehungen“ mit dem Beziehungsnetz ab (Richtung ChaBo → Netz) und liefert die Zeilen mit `relId`.
// Die andere Richtung übernimmt die Datenbankfunktion sync_relationship_sheets. Fehler brechen nie das Speichern des Bogens ab.
export async function syncFamilyRows(
  supabase: SupabaseClient,
  userId: string,
  characterId: string,
  rows: SheetItem[],
  prevRows: SheetItem[],
): Promise<SheetItem[]> {
  try {
    const { data: me } = await supabase.from("characters").select("world_id").eq("id", characterId).maybeSingle<{ world_id: string }>();
    if (!me) return rows;
    const worldId = me.world_id;
    const { data: chars } = await supabase.from("characters").select("id, name").eq("world_id", worldId).is("deleted_at", null).returns<MentionTarget[]>();
    const targets = chars ?? [];

    // Zeilen, die sich nur im Text unterscheiden, behalten ihre Verknüpfung (der Browser kennt die relId nach dem Speichern noch nicht)
    const prevByValue = new Map(prevRows.filter((r) => r.relId).map((r) => [norm(r.value), r.relId as string]));
    const next = rows.map((r) => (r.relId || !r.value.trim() ? r : prevByValue.has(norm(r.value)) ? { ...r, relId: prevByValue.get(norm(r.value)) } : r));

    const relIds = new Set<string>([...next.map((r) => r.relId).filter((x): x is string => !!x), ...prevRows.map((r) => r.relId).filter((x): x is string => !!x)]);
    const edges = new Map<string, Edge>();
    if (relIds.size > 0) {
      const { data } = await supabase
        .from("character_relationships")
        .select("id, world_id, character_a_id, character_b_id, type, family_role")
        .in("id", [...relIds])
        .returns<Edge[]>();
      for (const e of data ?? []) edges.set(e.id, e);
    }

    const dropEdge = async (e: Edge) => {
      const { count } = await supabase.from("character_relationships").delete({ count: "exact" }).eq("id", e.id);
      if (count) await supabase.rpc("unlink_relationship_sheets", { p_rel: e.id, p_a: e.character_a_id, p_b: e.character_b_id });
    };

    // Zeilen, die es nicht mehr gibt: Beziehung entfernen. Eine Zeile, in der gerade nur der Name halb getippt ist, behält ihre Beziehung
    // (der Bogen wird während des Tippens automatisch gespeichert).
    const keptRelIds = new Set(next.map((r) => r.relId).filter((x): x is string => !!x));
    for (const relId of relIds) {
      if (keptRelIds.has(relId)) continue;
      const e = edges.get(relId);
      if (e) await dropEdge(e);
      edges.delete(relId);
    }

    const touched = new Set<string>();
    const out: SheetItem[] = [];
    for (const r of next) {
      const targetId = r.secret ? null : singleMentionId(r.value, targets, characterId);
      if (!targetId) {
        out.push(r);
        continue;
      }
      let relId = r.relId;
      let edge = relId ? edges.get(relId) : undefined;
      if (relId && edge) {
        const other = edge.character_a_id === characterId ? edge.character_b_id : edge.character_a_id;
        if (other !== targetId) {
          // Andere Figur eingetragen: aus der alten Beziehung wird eine neue
          await dropEdge(edge);
          edges.delete(relId);
          relId = undefined;
          edge = undefined;
        } else {
          const label = r.label.trim();
          if (label && label !== canonicalLabel(edge, edge.character_a_id === characterId)) {
            const g = guessRelation(label);
            const swap = g.familyRole === "eltern" ? (g.targetIsParent ? { a: targetId, b: characterId } : { a: characterId, b: targetId }) : null;
            const { error } = await supabase
              .from("character_relationships")
              .update({ type: label.slice(0, 60), category: g.category, color: g.color, family_role: g.familyRole, ...(swap ? { character_a_id: swap.a, character_b_id: swap.b } : {}) })
              .eq("id", edge.id);
            if (!error) touched.add(edge.id);
          }
        }
      }
      if (!relId) {
        // Gibt es zwischen den beiden schon eine Beziehung, wird sie verknüpft statt eine zweite anzulegen
        const { data: existing } = await supabase
          .from("character_relationships")
          .select("id")
          .eq("world_id", worldId)
          .or(`and(character_a_id.eq.${characterId},character_b_id.eq.${targetId}),and(character_a_id.eq.${targetId},character_b_id.eq.${characterId})`)
          .limit(1)
          .maybeSingle<{ id: string }>();
        if (existing) {
          relId = existing.id;
          touched.add(existing.id);
        } else {
          const label = r.label.trim() || "Verbunden";
          const g = guessRelation(label);
          const parentIsTarget = g.familyRole === "eltern" && g.targetIsParent;
          const { data: created } = await supabase
            .from("character_relationships")
            .insert({
              world_id: worldId,
              character_a_id: parentIsTarget ? targetId : characterId,
              character_b_id: parentIsTarget ? characterId : targetId,
              type: label.slice(0, 60),
              color: g.color,
              category: g.category,
              family_role: g.familyRole,
              created_by: userId,
            })
            .select("id")
            .single<{ id: string }>();
          if (created) {
            relId = created.id;
            touched.add(created.id);
          }
        }
      }
      out.push(relId ? { ...r, relId } : r);
    }

    // Die andere Figur (und die Kopie bei ihr) nachziehen; die eigene Zeile bleibt, wie sie geschrieben wurde
    for (const id of touched) await supabase.rpc("sync_relationship_sheets", { p_rel: id, p_skip: characterId });
    return out;
  } catch {
    return rows;
  }
}
