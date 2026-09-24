"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Skull, X } from "lucide-react";
import { previewFateAction, postFateResultAction, type FatePreview } from "./actions";
import type { Character } from "@/lib/types";
import { SEVERITY_ORDER } from "@/lib/fate-types";
import type { Char1Config, FateSeverity, GenderFilter, SlotConfig } from "@/lib/fate-types";

export type WorldOption = {
  id: string;
  name: string;
  owners: { ownerId: string; label: string }[];
};

const GENDER_LABELS: Record<GenderFilter, string> = {
  alle: "Alle",
  weiblich: "Nur Frauen",
  maennlich: "Nur Männer",
  divers: "Nur Divers",
};

const SEVERITY_STYLES: Record<string, string> = {
  leicht: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  mittel: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  schwer: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "sehr schwer": "bg-red-500/15 text-red-600 dark:text-red-400",
  extrem: "bg-red-700/20 text-red-700 dark:text-red-300",
};

function GenderSelect({ value, onChange }: { value: GenderFilter; onChange: (v: GenderFilter) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fg-soft">
      Geschlecht
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as GenderFilter)}
        className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
      >
        {(Object.keys(GENDER_LABELS) as GenderFilter[]).map((g) => (
          <option key={g} value={g}>
            {GENDER_LABELS[g]}
          </option>
        ))}
      </select>
    </label>
  );
}

function WorldSelect({
  worldOptions,
  value,
  onChange,
}: {
  worldOptions: WorldOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fg-soft">
      Welt
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
      >
        {worldOptions.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProfilSelect({
  owners,
  value,
  onChange,
}: {
  owners: { ownerId: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fg-soft">
      Profil
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
      >
        <option value="alle">Alle</option>
        {owners.map((o) => (
          <option key={o.ownerId} value={o.ownerId}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const SEVERITY_LABELS: Record<FateSeverity, string> = {
  leicht: "Leicht",
  mittel: "Mittel",
  schwer: "Schwer",
  "sehr schwer": "Sehr schwer",
  extrem: "Extrem",
};

function SeveritySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FateSeverity;
  onChange: (v: FateSeverity) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fg-soft">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FateSeverity)}
        className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
      >
        {SEVERITY_ORDER.map((s) => (
          <option key={s} value={s}>
            {SEVERITY_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SchicksalForm({
  ownCharacters,
  worldOptions,
  activeWorldId,
}: {
  ownCharacters: Character[];
  worldOptions: WorldOption[];
  activeWorldId: string;
}) {
  const router = useRouter();
  const [char1Mode, setChar1Mode] = useState<"pool" | "specific">("pool");
  const [char1Id, setChar1Id] = useState(ownCharacters[0]?.id ?? "");
  const [char1Gender, setChar1Gender] = useState<GenderFilter>("alle");

  const [extraEnabled, setExtraEnabled] = useState(false);
  const [slots, setSlots] = useState<SlotConfig[]>([]);

  const [minSeverity, setMinSeverity] = useState<FateSeverity>("leicht");
  const [maxSeverity, setMaxSeverity] = useState<FateSeverity>("extrem");

  const [preview, setPreview] = useState<FatePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [posting, setPosting] = useState(false);

  function addSlot() {
    setSlots((prev) => (prev.length >= 2 ? prev : [...prev, { worldId: activeWorldId, gender: "alle", ownerId: "alle" }]));
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, patch: Partial<SlotConfig>) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function changeMinSeverity(value: FateSeverity) {
    setMinSeverity(value);
    if (SEVERITY_ORDER.indexOf(value) > SEVERITY_ORDER.indexOf(maxSeverity)) setMaxSeverity(value);
  }

  function changeMaxSeverity(value: FateSeverity) {
    setMaxSeverity(value);
    if (SEVERITY_ORDER.indexOf(value) < SEVERITY_ORDER.indexOf(minSeverity)) setMinSeverity(value);
  }

  async function roll() {
    setRolling(true);
    setError(null);
    const char1Config: Char1Config =
      char1Mode === "specific" ? { mode: "specific", characterId: char1Id } : { mode: "pool", gender: char1Gender };
    const result = await previewFateAction(char1Config, extraEnabled ? slots : [], { min: minSeverity, max: maxSeverity });
    setRolling(false);
    if ("error" in result) {
      setError(result.error);
      setPreview(null);
      return;
    }
    setPreview(result);
  }

  async function post() {
    if (!preview) return;
    setPosting(true);
    setError(null);
    const result = await postFateResultAction(
      preview.fateId,
      preview.char1.id,
      preview.targets.map((t) => t.id),
    );
    setPosting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.push(`/story/${result.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <p className="text-sm font-medium text-fg">Charakter 1</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setChar1Mode("pool")}
            aria-pressed={char1Mode === "pool"}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              char1Mode === "pool" ? "bg-accent-strong text-on-accent-strong" : "bg-surface text-fg-soft hover:text-fg"
            }`}
          >
            Zufällig aus Pool
          </button>
          <button
            type="button"
            onClick={() => setChar1Mode("specific")}
            aria-pressed={char1Mode === "specific"}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              char1Mode === "specific" ? "bg-accent-strong text-on-accent-strong" : "bg-surface text-fg-soft hover:text-fg"
            }`}
          >
            Bestimmter Charakter
          </button>
        </div>

        {char1Mode === "specific" ? (
          <select
            value={char1Id}
            onChange={(e) => setChar1Id(e.target.value)}
            className="rounded-md border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          >
            {ownCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="w-1/2 pr-1.5">
            <GenderSelect value={char1Gender} onChange={setChar1Gender} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <p className="text-sm font-medium text-fg">Schweregrad (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <SeveritySelect label="Mindestens" value={minSeverity} onChange={changeMinSeverity} />
          <SeveritySelect label="Höchstens" value={maxSeverity} onChange={changeMaxSeverity} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-fg">
          <input
            type="checkbox"
            checked={extraEnabled}
            onChange={(e) => {
              setExtraEnabled(e.target.checked);
              if (!e.target.checked) setSlots([]);
              else if (slots.length === 0) setSlots([{ worldId: activeWorldId, gender: "alle", ownerId: "alle" }]);
            }}
            className="rounded border-line"
          />
          Weitere Charaktere einbeziehen
        </label>

        {extraEnabled && (
          <div className="flex flex-col gap-3">
            {slots.map((slot, i) => {
              const owners = worldOptions.find((w) => w.id === slot.worldId)?.owners ?? [];
              return (
                <div key={i} className="flex flex-col gap-2 rounded-lg border border-line p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-fg-soft">Charakter {i + 2}</p>
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      aria-label={`Charakter ${i + 2} entfernen`}
                      className="text-muted transition hover:text-fg"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                  {worldOptions.length > 1 && (
                    <WorldSelect
                      worldOptions={worldOptions}
                      value={slot.worldId}
                      onChange={(worldId) => updateSlot(i, { worldId, ownerId: "alle" })}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <GenderSelect value={slot.gender} onChange={(g) => updateSlot(i, { gender: g })} />
                    <ProfilSelect owners={owners} value={slot.ownerId} onChange={(o) => updateSlot(i, { ownerId: o })} />
                  </div>
                </div>
              );
            })}
            {slots.length < 2 && (
              <button type="button" onClick={addSlot} className="self-start text-sm text-accent hover:underline">
                + weiteren Charakter hinzufügen
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="button"
        onClick={roll}
        disabled={rolling}
        className="flex items-center justify-center gap-2 self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        <Skull className="h-4 w-4" strokeWidth={2} />
        {rolling ? "Würfle..." : preview ? "Nochmal würfeln" : "Würfeln"}
      </button>

      {preview && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg-soft">{preview.category}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[preview.severity] ?? ""}`}>
              {preview.severity}
            </span>
          </div>
          <p className="font-serif text-xl leading-snug text-fg">{preview.text}</p>
          <button
            type="button"
            onClick={post}
            disabled={posting}
            className="self-start rounded-md bg-accent-strong px-5 py-2 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
          >
            {posting ? "Poste..." : "Als Szene posten"}
          </button>
        </div>
      )}
    </div>
  );
}
