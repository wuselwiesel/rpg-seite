"use client";

import { PRESENCE_STATUSES, presenceLabel, type PresenceStatusId } from "@/lib/presence-status";

export function StatusPicker({
  value,
  onToggle,
}: {
  value: PresenceStatusId | null;
  onToggle: (id: PresenceStatusId) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="Status">
      <span className="text-muted">Status:</span>
      {PRESENCE_STATUSES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onToggle(s.id)}
          aria-pressed={value === s.id}
          className={`rounded-full border px-2.5 py-1 transition ${
            value === s.id ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:text-fg-soft"
          }`}
        >
          {s.chip}
        </button>
      ))}
    </div>
  );
}

export function StatusList({
  others,
  hideIds = [],
}: {
  others: Record<string, { name: string; status: string }>;
  hideIds?: string[];
}) {
  const entries = Object.entries(others).filter(([id]) => !hideIds.includes(id));
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5 text-xs text-muted" role="status">
      {entries.map(([id, o]) => (
        <span key={id}>
          {o.name} {presenceLabel(o.status)}
        </span>
      ))}
    </div>
  );
}
