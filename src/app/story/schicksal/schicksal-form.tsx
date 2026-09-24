"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Skull, X } from "lucide-react";
import { previewFateAction, postFateResultAction, type FatePreview } from "./actions";
import type { Character } from "@/lib/types";
import type { Char1Config, GenderFilter, SlotConfig, SpeciesFilter } from "@/lib/fate-types";

const GENDER_LABELS: Record<GenderFilter, string> = {
  alle: "Alle",
  weiblich: "Nur Frauen",
  maennlich: "Nur Männer",
  divers: "Nur Divers",
};

const SPECIES_LABELS: Record<SpeciesFilter, string> = {
  alle: "Alle",
  mensch: "Nur Menschen",
  vampir: "Nur Vampire",
  werwolf: "Nur Werwölfe",
};

const SEVERITY_STYLES: Record<string, string> = {
  mittel: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  schwer: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "sehr schwer": "bg-red-500/15 text-red-600 dark:text-red-400",
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

function SpeciesSelect({ value, onChange }: { value: SpeciesFilter; onChange: (v: SpeciesFilter) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fg-soft">
      Profil
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SpeciesFilter)}
        className="rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
      >
        {(Object.keys(SPECIES_LABELS) as SpeciesFilter[]).map((sp) => (
          <option key={sp} value={sp}>
            {SPECIES_LABELS[sp]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SchicksalForm({
  ownCharacters,
  mentionable,
}: {
  ownCharacters: Character[];
  mentionable: Character[];
}) {
  const router = useRouter();
  const [char1Mode, setChar1Mode] = useState<"pool" | "specific">("pool");
  const [char1Id, setChar1Id] = useState(ownCharacters[0]?.id ?? "");
  const [char1Gender, setChar1Gender] = useState<GenderFilter>("alle");
  const [char1Species, setChar1Species] = useState<SpeciesFilter>("alle");

  const [extraEnabled, setExtraEnabled] = useState(false);
  const [slots, setSlots] = useState<SlotConfig[]>([]);

  const [preview, setPreview] = useState<FatePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [posting, setPosting] = useState(false);

  function addSlot() {
    setSlots((prev) => (prev.length >= 2 ? prev : [...prev, { gender: "alle", species: "alle" }]));
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, patch: Partial<SlotConfig>) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function roll() {
    setRolling(true);
    setError(null);
    const char1Config: Char1Config =
      char1Mode === "specific" ? { mode: "specific", characterId: char1Id } : { mode: "pool", gender: char1Gender, species: char1Species };
    const result = await previewFateAction(char1Config, extraEnabled ? slots : []);
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
          <div className="grid grid-cols-2 gap-3">
            <GenderSelect value={char1Gender} onChange={setChar1Gender} />
            <SpeciesSelect value={char1Species} onChange={setChar1Species} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-fg">
          <input
            type="checkbox"
            checked={extraEnabled}
            onChange={(e) => {
              setExtraEnabled(e.target.checked);
              if (!e.target.checked) setSlots([]);
              else if (slots.length === 0) setSlots([{ gender: "alle", species: "alle" }]);
            }}
            className="rounded border-line"
          />
          Weitere Charaktere einbeziehen
        </label>

        {extraEnabled && (
          <div className="flex flex-col gap-3">
            {slots.map((slot, i) => (
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
                <div className="grid grid-cols-2 gap-3">
                  <GenderSelect value={slot.gender} onChange={(g) => updateSlot(i, { gender: g })} />
                  <SpeciesSelect value={slot.species} onChange={(sp) => updateSlot(i, { species: sp })} />
                </div>
              </div>
            ))}
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
