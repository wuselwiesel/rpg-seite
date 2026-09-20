"use client";

import { useId, useMemo } from "react";
import type { Character, CharacterRelationship } from "@/lib/types";

export function RelationshipGraph({
  characters,
  relationships,
}: {
  characters: Character[];
  relationships: CharacterRelationship[];
}) {
  const clipBase = useId().replace(/:/g, "");
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

  const legend = useMemo(() => {
    const seen = new Map<string, string>();
    for (const rel of relationships) {
      if (!seen.has(rel.type)) seen.set(rel.type, rel.color);
    }
    return Array.from(seen.entries());
  }, [relationships]);

  if (characters.length === 0) {
    return <p className="text-sm text-muted">Keine Charaktere in dieser Ansicht.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-lg">
        <defs>
          {characters.map((c) => {
            const pos = positions.get(c.id);
            return pos ? (
              <clipPath key={c.id} id={`${clipBase}-${c.id}`}>
                <circle cx={pos.x} cy={pos.y} r={22} />
              </clipPath>
            ) : null;
          })}
        </defs>
        {relationships.map((rel) => {
          const a = positions.get(rel.character_a_id);
          const b = positions.get(rel.character_b_id);
          if (!a || !b) return null;
          return (
            <g key={rel.id}>
              <title>{rel.type}</title>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rel.color} strokeWidth={2.5} opacity={0.75} />
            </g>
          );
        })}
        {characters.map((c) => {
          const pos = positions.get(c.id);
          if (!pos) return null;
          return (
            <g key={c.id}>
              <circle cx={pos.x} cy={pos.y} r={24} className="fill-surface-2 stroke-line" strokeWidth={1.5} />
              {c.avatar_url ? (
                <image
                  href={c.avatar_url}
                  x={pos.x - 22}
                  y={pos.y - 22}
                  width={44}
                  height={44}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${clipBase}-${c.id})`}
                />
              ) : (
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-fg text-[11px] font-medium"
                >
                  {c.name.slice(0, 2).toUpperCase()}
                </text>
              )}
              <text x={pos.x} y={pos.y + 38} textAnchor="middle" className="fill-fg-soft text-[10px]">
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>

      {legend.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {legend.map(([type, color]) => (
            <span key={type} className="flex items-center gap-1.5 text-xs text-fg-soft">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
