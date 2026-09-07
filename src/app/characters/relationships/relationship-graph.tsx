"use client";

import { useMemo } from "react";
import type { Character, CharacterRelationship, RelationshipType } from "@/lib/types";

const TYPE_COLORS: Record<RelationshipType, string> = {
  verbuendet: "#5b9d6f",
  verfeindet: "#c0554d",
  liiert: "#c76ba3",
  familie: "#5b83c7",
  sonstiges: "#9a9a9a",
};

const TYPE_LABELS: Record<RelationshipType, string> = {
  verbuendet: "Verbündet",
  verfeindet: "Verfeindet",
  liiert: "Liiert",
  familie: "Familie",
  sonstiges: "Sonstiges",
};

export function RelationshipGraph({
  characters,
  relationships,
}: {
  characters: Character[];
  relationships: CharacterRelationship[];
}) {
  const size = 480;
  const center = size / 2;
  const radius = size / 2 - 70;

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    characters.forEach((c, i) => {
      const angle = (2 * Math.PI * i) / Math.max(characters.length, 1) - Math.PI / 2;
      map.set(c.id, {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      });
    });
    return map;
  }, [characters, center, radius]);

  if (characters.length === 0) {
    return <p className="text-sm text-muted">Noch keine Charaktere in dieser Welt.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-lg">
        {relationships.map((rel) => {
          const a = positions.get(rel.character_a_id);
          const b = positions.get(rel.character_b_id);
          if (!a || !b) return null;
          return (
            <line
              key={rel.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={TYPE_COLORS[rel.type]}
              strokeWidth={2}
              opacity={0.7}
            />
          );
        })}
        {characters.map((c) => {
          const pos = positions.get(c.id);
          if (!pos) return null;
          return (
            <g key={c.id}>
              <circle cx={pos.x} cy={pos.y} r={22} className="fill-surface-2 stroke-line" strokeWidth={1.5} />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-fg text-[11px] font-medium"
              >
                {c.name.slice(0, 2).toUpperCase()}
              </text>
              <text
                x={pos.x}
                y={pos.y + 36}
                textAnchor="middle"
                className="fill-fg-soft text-[10px]"
              >
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap justify-center gap-3">
        {(Object.keys(TYPE_LABELS) as RelationshipType[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-fg-soft">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
            {TYPE_LABELS[type]}
          </span>
        ))}
      </div>
    </div>
  );
}

export { TYPE_LABELS, TYPE_COLORS };
